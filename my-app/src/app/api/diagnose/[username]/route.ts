import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface CommitInfo {
  message: string;
  repo: string;
  sha: string;
  author: string;
  date: string;
}

interface DiagnosisResult {
  username: string;
  previousLife: string;
  personalityFlaws: string[];
  analysis: string;
  toxicityLevel: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  if (!username) {
    return NextResponse.json(
      { error: 'Username is required' },
      { status: 400 }
    );
  }

  // Anthropic APIキーの確認
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured' },
      { status: 500 }
    );
  }

  try {
    // 1. GitHubからコミット情報を取得
    const commitsResponse = await fetch(
      `${request.nextUrl.origin}/api/commits/${username}`,
      { next: { revalidate: 60 } }
    );

    if (!commitsResponse.ok) {
      const error = await commitsResponse.json();
      return NextResponse.json(error, { status: commitsResponse.status });
    }

    const commitsData = await commitsResponse.json();

    if (!commitsData.commits || commitsData.commits.length === 0) {
      return NextResponse.json(
        { error: 'No commits found for analysis' },
        { status: 404 }
      );
    }

    const commits: CommitInfo[] = commitsData.commits;

    // 2. Claude APIで診断を生成
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const commitMessages = commits.map(c => c.message).join('\n');
    const repoInfo = [...new Set(commits.map(c => c.repo))].join(', ');

    const prompt = `あなたは毒舌だが的確な診断をする、鋭い感性を持つAIエンジニア診断士です。
以下のGitHubユーザー「${username}」の直近のコミットメッセージを分析して、このエンジニアの「前世」と「性格の欠陥」を診断してください。

【分析対象】
ユーザー名: ${username}
リポジトリ: ${repoInfo}
コミット数: ${commits.length}件

【コミットメッセージ】
${commitMessages}

【診断指示】
1. コミットメッセージの特徴（長さ、頻度、内容、言語、スタイル）から性格を推測
2. 技術スタックや関心領域を読み取る
3. 完璧主義か適当か、慎重派か突進型か、などの傾向を分析
4. 以下のJSON形式で回答してください（日本語で）：

{
  "previousLife": "前世は〇〇。理由：...",
  "personalityFlaws": [
    "欠陥1: 具体的な指摘",
    "欠陥2: 具体的な指摘",
    "欠陥3: 具体的な指摘"
  ],
  "analysis": "総合的な分析。毒舌だが愛のある鋭い指摘を3-4文で。",
  "toxicityLevel": 85
}

【診断のポイント】
- 毒舌だが笑える内容に
- 具体的なコミットメッセージの特徴を根拠に
- エンジニアあるあるネタを織り交ぜる
- 「前世」は意外性とユーモアを重視
- 「欠陥」は3つ、それぞれ具体的に
- toxicityLevelは1-100で、毒の強さを表現

JSON以外の余計なテキストは出力しないでください。`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // レスポンスからJSON部分を抽出
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // JSONをパース（コードブロックで囲まれている可能性があるので処理）
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse diagnosis result');
    }

    const diagnosis = JSON.parse(jsonMatch[0]);

    const result: DiagnosisResult = {
      username,
      previousLife: diagnosis.previousLife,
      personalityFlaws: diagnosis.personalityFlaws,
      analysis: diagnosis.analysis,
      toxicityLevel: diagnosis.toxicityLevel,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error diagnosing engineer:', error);
    return NextResponse.json(
      {
        error: 'Failed to diagnose engineer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
