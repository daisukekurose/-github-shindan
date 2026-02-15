import { NextRequest, NextResponse } from 'next/server';

interface GitHubEvent {
  type: string;
  payload: {
    commits?: Array<{
      message: string;
      sha: string;
      author: {
        name: string;
        email: string;
      };
    }>;
    head?: string;
    ref?: string;
  };
  repo: {
    name: string;
  };
  created_at: string;
}

interface CommitInfo {
  message: string;
  repo: string;
  sha: string;
  author: string;
  date: string;
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

  try {
    // GitHub API: ユーザーのイベントを取得（直近30件）
    const response = await fetch(
      `https://api.github.com/users/${username}/events`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          // レート制限を緩和するため、環境変数があれば使用
          ...(process.env.GITHUB_TOKEN && {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
          })
        },
        // キャッシュを1分間保持
        next: { revalidate: 60 }
      }
    );

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const events: GitHubEvent[] = await response.json();

    // PushEventのみをフィルタしてコミット情報を抽出
    const commits: CommitInfo[] = [];

    for (const event of events) {
      if (event.type === 'PushEvent') {
        // payload.commitsが存在する場合（古いAPI形式）
        if (event.payload.commits && event.payload.commits.length > 0) {
          for (const commit of event.payload.commits) {
            commits.push({
              message: commit.message,
              repo: event.repo.name,
              sha: commit.sha.substring(0, 7),
              author: commit.author.name,
              date: event.created_at
            });
          }
        }
        // payload.headが存在する場合（新しいAPI形式）
        else if (event.payload.head) {
          try {
            // コミット詳細を取得
            const commitResponse = await fetch(
              `https://api.github.com/repos/${event.repo.name}/commits/${event.payload.head}`,
              {
                headers: {
                  'Accept': 'application/vnd.github.v3+json',
                  ...(process.env.GITHUB_TOKEN && {
                    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
                  })
                },
                next: { revalidate: 60 }
              }
            );

            if (commitResponse.ok) {
              const commitData = await commitResponse.json();
              commits.push({
                message: commitData.commit.message,
                repo: event.repo.name,
                sha: commitData.sha.substring(0, 7),
                author: commitData.commit.author.name,
                date: commitData.commit.author.date
              });
            }
          } catch (error) {
            console.error('Error fetching commit details:', error);
            // エラーが発生してもスキップして続行
          }
        }

        // 10件取得したら終了
        if (commits.length >= 10) break;
      }
    }

    // 直近10件に制限
    const recentCommits = commits.slice(0, 10);

    if (recentCommits.length === 0) {
      return NextResponse.json(
        { error: 'No recent commits found', commits: [] },
        { status: 200 }
      );
    }

    return NextResponse.json({
      username,
      totalCommits: recentCommits.length,
      commits: recentCommits
    });

  } catch (error) {
    console.error('Error fetching commits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch commits from GitHub' },
      { status: 500 }
    );
  }
}
