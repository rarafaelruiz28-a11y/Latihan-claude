# Campur voiceover + efek suara ElevenLabs ke video. Waktu dalam detik video (VO mulai di 3.0).
import subprocess
OFF = 3.0
cues = {
  'whoosh': ([13.05, 28.3, 41.6, 58.6, 78.88], 0.45),
  'ding':   ([0.25, 82.0], 0.40),
  'sip':    ([3.0], 0.55),
  'pop':    ([4.76, 6.04, 7.2, 8.6, 16.0, 17.4, 22.1, 29.7, 33.8, 45.3, 50.9, 56.2, 57.1, 57.8, 81.6]
             + [67.6 + i * 0.13 for i in range(7)], 0.30),
  'key':    ([27.0], 0.55),
  'warn':   ([40.5, 47.4, 53.9], 0.40),
  'success':([61.4, 69.24, 72.0, 74.9], 0.38),
}
inputs = ['-i', 'video_silent.mp4', '-i', 'audio/vo.mp3', '-stream_loop', '-1', '-i', 'audio/bubbles.mp3']
f = [f"[1:a]adelay={int(OFF*1000)}|{int(OFF*1000)}[vo]",
     "[2:a]atrim=0:90,asetpts=N/SR/TB,volume='if(between(t,18.5,28.3)+between(t,41.7,54),0.30,0)':eval=frame[bed]"]
labels = ['[vo]', '[bed]']
for idx, (name, (times, vol)) in enumerate(cues.items(), start=3):
    inputs += ['-i', f'audio/{name}.mp3']
    f.append(f"[{idx}:a]asplit={len(times)}" + ''.join(f"[{name}{i}s]" for i in range(len(times))))
    for i, t in enumerate(times):
        ms = int(t * 1000)
        f.append(f"[{name}{i}s]adelay={ms}|{ms},volume={vol}[{name}{i}]"); labels.append(f"[{name}{i}]")
f.append(''.join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=longest,atrim=0:90,loudnorm=I=-14:TP=-1.5:LRA=11[aout]")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error'] + inputs + ['-filter_complex', ';'.join(f), '-map', '0:v', '-map', '[aout]',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', '90', '-movflags', '+faststart',
                'gula_obesitas_diabetes_16x9.mp4'], check=True)
