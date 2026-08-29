interface ContentBlock {
  type?: unknown;
  text?: unknown;
}

interface TranscriptEntry {
  type?: unknown;
  isSidechain?: unknown;
  message?: { content?: unknown };
}

function blocks(entry: TranscriptEntry): ContentBlock[] {
  const content = entry.message?.content;
  return Array.isArray(content) ? (content as ContentBlock[]) : [];
}

// tool_result だけの user 行はツールの返り値であって入力ではない。
// これを境界にすると 1 回のツール呼び出しより前の発言を取りこぼす
function isUserPrompt(entry: TranscriptEntry): boolean {
  if (entry.type !== 'user') {
    return false;
  }
  if (typeof entry.message?.content === 'string') {
    return true;
  }
  return !blocks(entry).some((block) => block.type === 'tool_result');
}

function assistantText(entry: TranscriptEntry): string[] {
  if (entry.type !== 'assistant') {
    return [];
  }
  return blocks(entry)
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string);
}

// 直前の入力より後の assistant 発言だけを、書かれた順に返す。thinking は
// 画面にも文書にも残らないため対象外
export async function readTurnText(transcriptPath: string): Promise<string> {
  const file = Bun.file(transcriptPath);
  if (!(await file.exists())) {
    return '';
  }
  const lines = (await file.text()).split('\n');
  const texts: string[] = [];

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]?.trim();
    if (line === undefined || line === '') {
      continue;
    }
    let entry: TranscriptEntry;
    try {
      entry = JSON.parse(line) as TranscriptEntry;
    } catch {
      continue;
    }
    if (entry.isSidechain === true) {
      continue;
    }
    if (isUserPrompt(entry)) {
      break;
    }
    texts.unshift(...assistantText(entry));
  }
  return texts.join('\n\n');
}
