#!/bin/sh

# create dash .mpds
ffmpeg -i '../sounds/wavs/audioFeels_ambix16.wav' -filter 'channelmap=0|1|2|3|4|5|6|7:' -c:a libopus -b:a 512k -vn -f dash './dash_audio1/audio_01-08ch.mpd' -filter 'channelmap=8|9|10|11|12|13|14|15:' -c:a libopus -b:a 512k -vn -f dash './dash_audio2/audio_09-16ch.mpd'
ffmpeg -i "../videos/zylia_demo_vr_medium_quality.mp4" -c:v libvpx-vp9 -s 1280x720 -b:v 1500k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f dash "./dash_video/video.mpd"

