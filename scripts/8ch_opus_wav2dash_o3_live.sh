#!/bin/sh

# create dash .mpds
ffmpeg -i \
    '../sounds/wavs/audioFeels_ambix16.wav' \
    -filter 'channelmap=0|1|2|3|4|5|6|7:' -c:a libopus -b:a 512k -vn -f dash -init_seg_name 'init-stream$RepresentationID$_audio_01-08ch.webm' -media_seg_name 'chunk-stream$RepresentationID$_audio_01-08ch-$Number%05d$.webm' './dash/audio_01-08ch.mpd' \
    -filter 'channelmap=8|9|10|11|12|13|14|15:' -c:a libopus -b:a 512k -vn -f dash -init_seg_name 'init-stream$RepresentationID$_audio_09-16ch.webm' -media_seg_name 'chunk-stream$RepresentationID$_audio_09-16ch-$Number%05d$.webm' './dash/audio_09-16ch.mpd'

ffmpeg \
    -i '../videos/zylia_demo_vr_medium_quality.mp4' -c:v libvpx-vp9 -s 1280x720 -b:v 1500k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f dash -init_seg_name 'init-stream$RepresentationID$_video.webm' -media_seg_name 'chunk-stream$RepresentationID$_video-$Number%05d$.webm' './dash/video.mpd'

