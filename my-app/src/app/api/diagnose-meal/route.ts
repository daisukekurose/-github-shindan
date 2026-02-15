import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { saveDiagnosis } from '@/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface MealDiagnosisResult {
  sermon: string;
  nickname: string;
  healthRisk: string;
  toxicityLevel: number;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meals } = body;

    if (!meals || meals.trim().length === 0) {
      return NextResponse.json(
        { error: '献立を入力してください' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `あなたは超・毒舌な管理栄養士です。容赦ない言葉で、でもどこか愛のある説教をします。

以下は、ある人が昨日食べたものです：

${meals}

上記の献立を分析して、以下のJSON形式で回答してください（日本語で）：

{
  "sermon": "毒舌だが愛のある説教。200文字以内で簡潔に、でも心に深く突き刺さるように。「〇〇ばっかり食べて...」のような口調で。",
  "nickname": "献立の特徴から付けた二つ名。20文字以内。例：「揚げ物の化身」「炭水化物の権化」「野菜ゼロ戦士」など",
  "healthRisk": "このままの食生活を続けた場合の10年後の健康リスク。200文字以内で簡潔に、でも恐怖を感じるくらいリアルに。",
  "toxicityLevel": 85
}

【重要】
- 各項目は指定文字数以内で簡潔に！
- 毒舌だが笑える内容に
- 栄養バランスの偏りを鋭く指摘
- 「野菜食べなさい」的な説教口調
- 二つ名は面白く、でも的確に
- 健康リスクは少し怖いくらいリアルに
- toxicityLevelは1-100で、毒の強さを表現
- SNSでシェアしたくなるような内容

JSON以外の余計なテキストは出力しないでください。`;

    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 800,
      temperature: 0.8,
    });

    const responseText = chatCompletion.choices[0]?.message?.content ?? '';

    // JSONをパース
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse diagnosis result');
    }

    const diagnosis = JSON.parse(jsonMatch[0]);

    const result: MealDiagnosisResult = {
      sermon: diagnosis.sermon,
      nickname: diagnosis.nickname,
      healthRisk: diagnosis.healthRisk,
      toxicityLevel: diagnosis.toxicityLevel,
    };

    // Supabaseに診断結果を保存
    try {
      await saveDiagnosis({
        meals,
        sermon: diagnosis.sermon,
        nickname: diagnosis.nickname,
        health_risk: diagnosis.healthRisk,
        toxicity_level: diagnosis.toxicityLevel,
      });
    } catch (saveError) {
      // 保存エラーはログに出すが、診断結果は返す
      console.error('Failed to save to Supabase:', saveError);
    }

    return NextResponse.json(result, { headers: corsHeaders });

  } catch (error) {
    console.error('Error diagnosing meal:', error);
    return NextResponse.json(
      {
        error: '診断に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
