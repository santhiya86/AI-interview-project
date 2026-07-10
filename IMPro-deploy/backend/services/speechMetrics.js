// Speech metrics computation from Whisper word-timestamp output
const FILLERS = ["um","uh","umm","uhh","like","you know","actually","basically","i mean","so yeah","right","okay so"];

function compute(whisperResult, audioDurationSec) {
  const segments = whisperResult.segments || [];
  const text = whisperResult.text || "";
  const words = segments.flatMap(s => s.words || []);

  const wordCount = words.length || text.split(/\s+/).filter(Boolean).length;
  const speakingDur = segments.length
    ? (segments[segments.length-1].end - segments[0].start)
    : audioDurationSec;

  const wpm = speakingDur > 0 ? Math.round((wordCount / speakingDur) * 60) : 0;

  // Pauses between segments
  const gaps = [];
  for (let i = 1; i < segments.length; i++) {
    const g = segments[i].start - segments[i-1].end;
    if (g > 0.3) gaps.push(g);
  }
  const longPauses = gaps.filter(g => g > 2).length;
  const totalSilence = gaps.reduce((a,b) => a+b, 0);
  const silentGapRatio = audioDurationSec > 0 ? +(totalSilence/audioDurationSec).toFixed(2) : 0;

  const lower = text.toLowerCase();
  const fillerCount = FILLERS.reduce((sum, f) => {
    const m = lower.match(new RegExp(`\\b${f}\\b`, "g"));
    return sum + (m ? m.length : 0);
  }, 0);
  const fillerRate = wordCount > 0 ? +((fillerCount/wordCount)*100).toFixed(1) : 0;

  const responseTimeSec = +(segments[0]?.start ?? 0).toFixed(1);

  // Voice stability: penalise pauses and fillers
  const voiceStabilityScore = Math.max(0, Math.round(100 - longPauses*15 - fillerRate*2));

  return {
    transcript: text.trim(),
    wordCount,
    speakingDurationSec: +speakingDur.toFixed(1),
    audioDurationSec: +audioDurationSec.toFixed(1),
    wpm,
    pauseCount: gaps.length,
    longPauses,
    totalSilenceSec: +totalSilence.toFixed(1),
    silentGapRatio,
    fillerCount,
    fillerRate,
    responseTimeSec,
    voiceStabilityScore
  };
}

module.exports = { compute };
