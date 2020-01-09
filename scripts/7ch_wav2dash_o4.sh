#!/bin/sh

echo "enter name of source audio file group:"
read fn

echo "enter full file name of source video file:"
read vidfn

# --------- transcode audio + remap channels to meet acn ---------
#ffmpeg -channel_layout 7.1 -i "../sounds/wavs/"$fn$"_01-07ch.wav" -c:a aac -b:a 320k -vn -af "channelmap=1|2|0|7|5|6|3|4:7.1" "../sounds/m4as/"$fn$"_01-07ch.m4a"
#ffmpeg -channel_layout 7.1 -i "../sounds/wavs/"$fn$"_08-14ch.wav" -c:a aac -b:a 320k -vn -af "channelmap=1|2|0|7|5|6|3|4:7.1" "../sounds/m4as/"$fn$"_08-14ch.m4a"
#ffmpeg -channel_layout 7.1 -i "../sounds/wavs/"$fn$"_15-21ch.wav" -c:a aac -b:a 320k -vn -af "channelmap=1|2|0|7|5|6|3|4:7.1" "../sounds/m4as/"$fn$"_15-21ch.m4a"
#ffmpeg -channel_layout 4.0 -i "../sounds/wavs/"$fn$"_22-25ch.wav" -c:a aac -b:a 320k -vn -af "channelmap=1|2|0|3:4.0" "../sounds/m4as/"$fn$"_22-25ch.m4a"

# --------- transcode audio + 7.1 aac profile channel mapping ---------
#ffmpeg -channel_layout 7.1 -i "../sounds/wavs/"$fn$"_01-07ch.wav" -c:a aac -b:a 320k -vn "../sounds/m4as/"$fn$"_01-07ch.m4a"
#ffmpeg -channel_layout 7.1 -i "../sounds/wavs/"$fn$"_08-14ch.wav" -c:a aac -b:a 320k -vn "../sounds/m4as/"$fn$"_08-14ch.m4a"
#ffmpeg -channel_layout 7.1 -i "../sounds/wavs/"$fn$"_15-21ch.wav" -c:a aac -b:a 320k -vn "../sounds/m4as/"$fn$"_15-21ch.m4a"
#ffmpeg -channel_layout 4.0 -i "../sounds/wavs/"$fn$"_22-25ch.wav" -c:a aac -b:a 320k -vn "../sounds/m4as/"$fn$"_22-25ch.m4a"

# --------- transcode audio + 7.1 aac profile channel mapping, 64kbit/ch ---------
ffmpeg -channel_layout 7.1 -i "../sounds/wavs/"$fn$"_01-07ch.wav" -c:a aac -b:a 512k -vn "../sounds/m4as/"$fn$"_01-07ch.m4a"
ffmpeg -channel_layout 7.1 -i "../sounds/wavs/"$fn$"_08-14ch.wav" -c:a aac -b:a 512k -vn "../sounds/m4as/"$fn$"_08-14ch.m4a"
ffmpeg -channel_layout 7.1 -i "../sounds/wavs/"$fn$"_15-21ch.wav" -c:a aac -b:a 512k -vn "../sounds/m4as/"$fn$"_15-21ch.m4a"
ffmpeg -channel_layout 4.0 -i "../sounds/wavs/"$fn$"_22-25ch.wav" -c:a aac -b:a 256k -vn "../sounds/m4as/"$fn$"_22-25ch.m4a"

# --------- transcode video: 24fps seems to work nicely! ---------
ffmpeg -i "../videos/"$vidfn -preset slow -tune film -vsync passthrough -write_tmcd 0 -an -c:v libx264 -x264opts 'keyint=25:min-keyint=25:no-scenecut' -crf 22  -maxrate 5000k -bufsize 10000k -pix_fmt yuv420p -f mp4 -movflags frag_keyframe+empty_moov+default_base_moof "../videos/mp4s/"$fn"_5000.mp4"

ffmpeg -i "../videos/"$vidfn -preset slow -tune film -vsync passthrough -write_tmcd 0 -an -c:v libx264 -x264opts 'keyint=25:min-keyint=25:no-scenecut' -crf 23  -maxrate 2000k -bufsize 4000k -pix_fmt yuv420p -f mp4 -movflags frag_keyframe+empty_moov+default_base_moof "../videos/mp4s/"$fn"_2000.mp4"

# --------- dash audio video ---------
mkdir ../media/$fn
MP4Box -dash 4000 -rap -frag-rap -bs-switching no -profile "dashavc264:live" "../sounds/m4as/"$fn"_01-07ch.m4a" -out "../media/"$fn"/audio_01-07ch.mpd"
MP4Box -dash 4000 -rap -frag-rap -bs-switching no -profile "dashavc264:live" "../sounds/m4as/"$fn"_08-14ch.m4a" -out "../media/"$fn"/audio_08-14ch.mpd"
MP4Box -dash 4000 -rap -frag-rap -bs-switching no -profile "dashavc264:live" "../sounds/m4as/"$fn"_15-21ch.m4a" -out "../media/"$fn"/audio_15-21ch.mpd"
MP4Box -dash 4000 -rap -frag-rap -bs-switching no -profile "dashavc264:live" "../sounds/m4as/"$fn"_22-25ch.m4a" -out "../media/"$fn"/audio_22-25ch.mpd"

MP4Box -dash 4000 -rap -frag-rap  -bs-switching no -profile "dashavc264:live" "../videos/mp4s/"$fn"_5000.mp4" "../videos/mp4s/"$fn"_2000.mp4" -out "../media/"$fn"/video.mpd"