#!/bin/sh

echo "enter name of source audio file group:"
read fn

echo "enter full file name of source video file:"
read vidfn

ffmpeg -i "../videos/"$vidfn -c:v libvpx-vp9 -s 160x90 -b:v 250k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 "../videos/webm/"$fn"_160x90_250k.webm"
ffmpeg -i "../videos/"$vidfn -c:v libvpx-vp9 -s 320x180 -b:v 500k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 "../videos/webm/"$fn"_320x180_500k.webm"
ffmpeg -i "../videos/"$vidfn -c:v libvpx-vp9 -s 640x360 -b:v 750k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 "../videos/webm/"$fn"_640x360_750k.webm"
ffmpeg -i "../videos/"$vidfn -c:v libvpx-vp9 -s 640x360 -b:v 1000k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 "../videos/webm/"$fn"_640x360_1000k.webm"
ffmpeg -i "../videos/"$vidfn -c:v libvpx-vp9 -s 1280x720 -b:v 1500k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 "../videos/webm/"$fn"_1280x720_1500k.webm"

############################# non-live, without chunks #############################
# chunks created internally???
# at least this is works in chrome and firefox!!
ffmpeg -i "../sounds/wavs/"$fn$"_01-08ch.wav" -c:a libopus -b:a 512k -vn -f webm -dash 1 "../sounds/webm/"$fn$"_01-08ch.webm"
ffmpeg -i "../sounds/wavs/"$fn$"_09-16ch.wav" -c:a libopus -b:a 512k -vn -f webm -dash 1 "../sounds/webm/"$fn$"_09-16ch.webm"
ffmpeg -i "../sounds/wavs/"$fn$"_17-24ch.wav" -c:a libopus -b:a 512k -vn -f webm -dash 1 "../sounds/webm/"$fn$"_17-24ch.webm"
ffmpeg -i "../sounds/wavs/"$fn$"_25-25ch.wav" -c:a libopus -b:a 64k -vn -f webm -dash 1 "../sounds/webm/"$fn$"_25-25ch.webm"


############################# DASHING #############################
mkdir ../media/$fn

ffmpeg \
 -f webm_dash_manifest -i "../videos/webm/"$fn"_160x90_250k.webm" \
 -f webm_dash_manifest -i "../videos/webm/"$fn"_320x180_500k.webm" \
 -f webm_dash_manifest -i "../videos/webm/"$fn"_640x360_750k.webm" \
 -f webm_dash_manifest -i "../videos/webm/"$fn"_640x360_1000k.webm" \
 -f webm_dash_manifest -i "../videos/webm/"$fn"_1280x720_1500k.webm" \
 -c copy -map 0 -map 1 -map 2 -map 3 -map 4 \
 -f webm_dash_manifest \
 -adaptation_sets "id=0,streams=0,1,2,3,4" \
 "../webm_media/"$fn"/video.mpd"

ffmpeg -f webm_dash_manifest -i "../sounds/webm/"$fn$"_01-08ch.webm" -c copy -map 0 -f webm_dash_manifest -adaptation_sets "id=0,streams=0" "../webm_media/"$fn"/audio_01-07ch.mpd"
ffmpeg -f webm_dash_manifest -i "../sounds/webm/"$fn$"_09-16ch.webm" -c copy -map 0 -f webm_dash_manifest -adaptation_sets "id=0,streams=0" "../webm_media/"$fn"/audio_08-16ch.mpd"
ffmpeg -f webm_dash_manifest -i "../sounds/webm/"$fn$"_17-24ch.webm" -c copy -map 0 -f webm_dash_manifest -adaptation_sets "id=0,streams=0" "../webm_media/"$fn"/audio_17-24ch.mpd"
ffmpeg -f webm_dash_manifest -i "../sounds/webm/"$fn$"_25-25ch.webm" -c copy -map 0 -f webm_dash_manifest -adaptation_sets "id=0,streams=0" "../webm_media/"$fn"/audio_25-25ch.mpd"
