import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 型定義
export interface MealDiagnosis {
  id?: string;
  meals: string;
  sermon: string;
  nickname: string;
  health_risk: string;
  toxicity_level: number;
  created_at?: string;
}

// 診断結果を保存
export async function saveDiagnosis(diagnosis: MealDiagnosis) {
  const { data, error } = await supabase
    .from('meal_diagnoses')
    .insert([
      {
        meals: diagnosis.meals,
        sermon: diagnosis.sermon,
        nickname: diagnosis.nickname,
        health_risk: diagnosis.health_risk,
        toxicity_level: diagnosis.toxicity_level,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error saving diagnosis:', error);
    throw error;
  }

  return data;
}

// 最新の診断結果を取得
export async function getRecentDiagnoses(limit = 10) {
  const { data, error } = await supabase
    .from('meal_diagnoses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching diagnoses:', error);
    throw error;
  }

  return data;
}
