#!/bin/sh

echo "enter name of source audio file group:"
read fn

echo "enter full file name of source video file:"
read vidfn

ffmpeg -i 2015_VokalTotal.m4v -c:v libvpx-vp9 -s 160x90 -b:v 250k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 2015_VokalTotal_160x90_250k.webm
ffmpeg -i 2015_VokalTotal.m4v -c:v libvpx-vp9 -s 320x180 -b:v 500k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 2015_VokalTotal_320x180_500k.webm
ffmpeg -i 2015_VokalTotal.m4v -c:v libvpx-vp9 -s 640x360 -b:v 750k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 2015_VokalTotal_640x360_750k.webm
ffmpeg -i 2015_VokalTotal.m4v -c:v libvpx-vp9 -s 640x360 -b:v 1000k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 2015_VokalTotal_640x360_1000k.webm
ffmpeg -i 2015_VokalTotal.m4v -c:v libvpx-vp9 -s 1280x720 -b:v 1500k -keyint_min 150 -g 150 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 2015_VokalTotal_1280x720_500k.webm

# in chrome 8ch is max, the following works in firefox and chrome
ffmpeg -i "2015_VokalTotal_01-08ch.wav" -c:a libopus -ar 48000 -mapping_family 255 -b:a 512k -vn -f webm -dash 1 "2015_VokalTotal_01-08ch.webm"
ffmpeg -i "2015_VokalTotal_01-08ch.wav" -c:a libopus -ar 48000 -mapping_family 255 -b:a 512k -vn -f opus -dash 1 "2015_VokalTotal_01-08ch.opus"

# libopus does not support 44.1 kHz
ffmpeg -i "2015_VokalTotal_01-08ch.wav" -c:a libopus -ar 48000 -mapping_family 255 -b:a 512k -vn -f webm -dash 1 "2015_VokalTotal_01-08ch.webm"
ffmpeg -i "2015_VokalTotal_09-16ch.wav" -c:a libopus -ar 48000 -mapping_family 255 -b:a 512k -vn -f webm -dash 1 "2015_VokalTotal_09-16ch.webm"
ffmpeg -i "2015_VokalTotal_17-24ch.wav" -c:a libopus -ar 48000 -mapping_family 255 -b:a 512k -vn -f webm -dash 1 "2015_VokalTotal_17-24ch.webm"
ffmpeg -i "2015_VokalTotal_25-25ch.wav" -c:a libopus -ar 48000 -mapping_family 255 -b:a 64k -vn -f webm -dash 1 "2015_VokalTotal_25-25ch.webm"
ffmpeg -i "2015_VokalTotal.wav" -c:a libopus -ar 48000 -mapping_family 255 -b:a 1600k -vn -f webm -dash 1 "2015_VokalTotal_01-25ch.webm"

################################# DASHING #################################

ffmpeg \
-f webm_dash_manifest -i 2015_VokalTotal_160x90_250k.webm \
-f webm_dash_manifest -i 2015_VokalTotal_320x180_500k.webm \
-f webm_dash_manifest -i 2015_VokalTotal_640x360_750k.webm \
-f webm_dash_manifest -i 2015_VokalTotal_640x360_1000k.webm \
-f webm_dash_manifest -i 2015_VokalTotal_1280x720_500k.webm \
-f webm_dash_manifest -i 2015_VokalTotal_17-25ch.webm \
-c copy -map 0 -map 1 -map 2 -map 3 -map 4 -map 5 \
-f webm_dash_manifest \
-adaptation_sets "id=0,streams=0,1,2,3,4 id=1,streams=5" \
manifest.mpd

ffmpeg -i 2015_VokalTotal_1280x720_500k.webm -c copy -f webm_dash_manifest "dash/video.mpd"
# this does not generate any chunks and therefore does not work!
ffmpeg -f webm_dash_manifest -i 2015_VokalTotal_01-08ch.webm -c copy -map 0 -b:a 512k "dash/audio_01-08ch.mpd"

############################# webm chunks #############################
# this doesnt seem to work, neither with -filter 'channelmap=0-0|1-1'
ffmpeg -i "2015_VokalTotal_01-08ch.wav" -map 0 -c:a libopus -ar 48000 -mapping_family 255 -b:a 512k -vn -f webm_chunk -audio_chunk_duration 2000 -header dash/stream.hdr -chunk_start_index 1 dash/stream_%d.chk
# creation of manifest doesnt: Could not write header for output file #0 (incorrect codec parameters ?): Invalid data found when processing input
ffmpeg -f webm_dash_manifest -live 1 -i dash/stream.hdr -c copy -map 0 -f webm_dash_manifest -live 1 -adaptation_sets "id=0,streams=0" -chunk_start_index 1 -chunk_duration_ms 2000 -time_shift_buffer_depth 7200 -minimum_update_period 7200 dash/audio_01-08ch.mpd

ffmpeg -i "2015_VokalTotal_01-08ch.wav" -map 0 -f webm_chunk

############################# non-live, without chunks #############################
# chunks created internally???
# at least this is works in chrome and firefox!!
ffmpeg -i 2015_VokalTotal_01-08ch.wav -c:a libopus -b:a 512k -vn -f webm -dash 1 audio.webm
ffmpeg -f webm_dash_manifest -i audio.webm -c copy -map 0 -f webm_dash_manifest -adaptation_sets "id=0,streams=0" manifest.mpd

#######################################################################
# this is from the official webm website
VP9_LIVE_PARAMS="-speed 6 -tile-columns 4 -frame-parallel 1 -threads 8 -static-thresh 0 -max-intra-rate 300 -deadline realtime -lag-in-frames 0 -error-resilient 1"

ffmpeg \
  -f v4l2 -input_format mjpeg -r 30 -s 1280x720 -i /dev/video0 \
  -f alsa -ar 44100 -ac 2 -i hw:2 \
  -map 0:0 \
  -pix_fmt yuv420p \
  -c:v libvpx-vp9 \
    -s 1280x720 -keyint_min 60 -g 60 ${VP9_LIVE_PARAMS} \
    -b:v 3000k \
  -f webm_chunk \
    -header "/var/www/webm_live/glass_360.hdr" \
    -chunk_start_index 1 \
  /var/www/webm_live/glass_360_%d.chk \
  -map 1:0 \
  -c:a libvorbis \
    -b:a 128k -ar 44100 \
  -f webm_chunk \
    -audio_chunk_duration 2000 \
    -header /var/www/webm_live/glass_171.hdr \
    -chunk_start_index 1 \
  /var/www/webm_live/glass_171_%d.chk

  ffmpeg \
    -f webm_dash_manifest -live 1 \
    -i /var/www/webm_live/glass_360.hdr \
    -f webm_dash_manifest -live 1 \
    -i /var/www/webm_live/glass_171.hdr \
    -c copy \
    -map 0 -map 1 \
    -f webm_dash_manifest -live 1 \
      -adaptation_sets "id=0,streams=0 id=1,streams=1" \
      -chunk_start_index 1 \
      -chunk_duration_ms 2000 \
      -time_shift_buffer_depth 7200 \
      -minimum_update_period 7200 \
    /var/www/webm_live/glass_live_manifest.mpd

#######################################################################
ffmpeg \
    -y \
    -f v4l2 \
        -i /dev/video0 \
        -s 640x480 \
        -input_format mjpeg \
        -r 24 \
    -map 0:0 \
    -pix_fmt yuv420p \
    -codec:v libvpx \
        -s 640x480 \
        -threads 4 \
        -b:v 50k \
        -tile-columns 4 \
        -frame-parallel 1 \
        -keyint_min 24 -g 24 \
    -f webm_chunk \
        -header "stream.hdr" \
        -chunk_start_index 1 \
    stream_%d.chk &

sleep 2

ffmpeg \
    -f webm_dash_manifest -live 1 \
    -i stream.hdr \
    -c copy \
    -map 0 \
    -f webm_dash_manifest -live 1 \
        -adaptation_sets "id=0,streams=0" \
        -chunk_start_index 1 \
        -chunk_duration_ms 1000 \
        -time_shift_buffer_depth 30000 \
        -minimum_update_period 60000 \
    stream_manifest.mpd
