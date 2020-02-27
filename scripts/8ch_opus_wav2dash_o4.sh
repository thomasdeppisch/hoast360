#!/bin/sh

echo 'enter name of source audio file without file extension:'
read fn

echo 'enter name of source video file with file extension:'
read vidfn

outdir='../webm_media/'$fn
mkdir $outdir

ffmpeg -i '../videos/'$vidfn -c:v libvpx-vp9 -s 360x180 -b:v 500k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$fn'_360_500k.webm'
ffmpeg -i '../videos/'$vidfn -c:v libvpx-vp9 -s 720x360 -b:v 750k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$fn'_720_750k.webm'
ffmpeg -i '../videos/'$vidfn -c:v libvpx-vp9 -s 720x360 -b:v 1000k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$fn'_720_1000k.webm'
ffmpeg -i '../videos/'$vidfn -c:v libvpx-vp9 -s 1080x540 -b:v 1500k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$fn'_1080_1500k.webm'
ffmpeg -i '../videos/'$vidfn -c:v libvpx-vp9 -s 1440x720 -b:v 2000k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$fn'_1440_2000k.webm'
ffmpeg -i '../videos/'$vidfn -c:v libvpx-vp9 -s 2560x1280 -b:v 2500k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$fn'_2560_2500k.webm'
ffmpeg -i '../videos/'$vidfn -c:v libvpx-vp9 -s 3840x1920 -b:v 3000k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$fn'_3840_3000k.webm'

############################# non-live, without chunks #############################
# chunks created internally!
# at least this is works in chrome and firefox!!

ffmpeg \
    -i '../sounds/wavs/'$fn'.wav' \
    -filter 'channelmap=0|1|2|3|4|5|6|7:' -c:a libopus -b:a 512k -vn -f webm -dash 1 $outdir'/'$fn'_01-08ch.webm' \
    -filter 'channelmap=8|9|10|11|12|13|14|15:' -c:a libopus -b:a 512k -vn -f webm -dash 1 $outdir'/'$fn'_09-16ch.webm' \
    -filter 'channelmap=16|17|18|19|20|21|22|23:' -c:a libopus -b:a 512k -vn -f webm -dash 1 $outdir'/'$fn'_17-24ch.webm' \
    -filter 'channelmap=24:' -c:a libopus -b:a 64k -vn -f webm -dash 1 $outdir'/'$fn'_25-25ch.webm' \

############################# CREATE DASH MANIFESTS #############################

ffmpeg \
    -f webm_dash_manifest -i $outdir'/'$fn'_360_500k.webm' \
    -f webm_dash_manifest -i $outdir'/'$fn'_720_750k.webm' \
    -f webm_dash_manifest -i $outdir'/'$fn'_720_1000k.webm' \
    -f webm_dash_manifest -i $outdir'/'$fn'_1080_1500k.webm' \
    -f webm_dash_manifest -i $outdir'/'$fn'_1440_2000k.webm' \
    -c copy -map 0 -map 1 -map 2 -map 3 -map 4 \
    -f webm_dash_manifest \
    -adaptation_sets 'id=0,streams=0,1,2,3,4' \
    $outdir'/video.mpd'

ffmpeg -f webm_dash_manifest -i $outdir'/'$fn$'_01-08ch.webm' -c copy -map 0 -f webm_dash_manifest -adaptation_sets 'id=0,streams=0' $outdir'/audio_01-08ch.mpd'
ffmpeg -f webm_dash_manifest -i $outdir'/'$fn$'_09-16ch.webm' -c copy -map 0 -f webm_dash_manifest -adaptation_sets 'id=0,streams=0' $outdir'/audio_09-16ch.mpd'
ffmpeg -f webm_dash_manifest -i $outdir'/'$fn$'_17-24ch.webm' -c copy -map 0 -f webm_dash_manifest -adaptation_sets 'id=0,streams=0' $outdir'/audio_17-24ch.mpd'
ffmpeg -f webm_dash_manifest -i $outdir'/'$fn$'_25-25ch.webm' -c copy -map 0 -f webm_dash_manifest -adaptation_sets 'id=0,streams=0' $outdir'/audio_25-25ch.mpd'
