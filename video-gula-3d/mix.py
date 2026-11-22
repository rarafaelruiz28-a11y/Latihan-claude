# Campur voiceover (Vidi) + efek suara ElevenLabs ke video Shorts 3D. Waktu dalam detik video (VO mulai 0.8).
import subprocess
OFF, DUR = 0.8, 58
cues = {
  'sip':     ([0.9], 0.55),
  'whoosh':  ([5.3, 11.35, 19.8, 28.7, 35.85, 44.45], 0.5),
  'pop':     ([2.0, 2.4, 8.3, 14.0, 22.4, 24.1, 24.5, 24.9, 47.3, 48.7, 51.3], 0.32),
  'key':     ([16.1], 0.6),
  'ding':    ([19.2], 0.45),
  'warn':    ([32.2, 36.2, 42.9], 0.42),
  'success': ([44.8, 52.9], 0.4),
}
inputs = ['-i', 'video_silent.mp4', '-i', 'audio/vo.mp3', '-stream_loop', '-1', '-i', 'audio/bubbles.mp3']
f = [f"[1:a]adelay={int(OFF*1000)}|{int(OFF*1000)}[vo]",
     f"[2:a]atrim=0:{DUR},asetpts=N/SR/TB,volume='if(between(t,5.5,20)+between(t,36,44.7),0.32,0)':eval=frame[bed]"]
labels = ['[vo]', '[bed]']
for idx, (name, (times, vol)) in enumerate(cues.items(), start=3):
    inputs += ['-i', f'audio/{name}.mp3']
    f.append(f"[{idx}:a]asplit={len(times)}" + ''.join(f"[{name}{i}s]" for i in range(len(times))))
    for i, t in enumerate(times):
        ms = int(t * 1000)
        f.append(f"[{name}{i}s]adelay={ms}|{ms},volume={vol}[{name}{i}]"); labels.append(f"[{name}{i}]")
f.append(''.join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=longest,atrim=0:{DUR},loudnorm=I=-14:TP=-1.5:LRA=11[aout]")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error'] + inputs + ['-filter_complex', ';'.join(f), '-map', '0:v', '-map', '[aout]',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', str(DUR), '-movflags', '+faststart',
                'gula_3d_shorts_9x16.mp4'], check=True)
