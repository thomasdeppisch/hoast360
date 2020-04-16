#!/bin/sh

ffmpeg -y -re -i '../videos/hoast_analyzer.mp4' -i '../sounds/wavs/hoast_demo.wav' \
    -map 0:0 -pix_fmt yuv420p -c:v libvpx-vp9 -s 1920x1080 -keyint_min 60 -g 60 -speed 6 -tile-columns 4 -frame-parallel 1 -threads 8 -static-thresh 0 \
    -max-intra-rate 300 -deadline realtime -lag-in-frames 0 -error-resilient 1 -b:v 6000k \
    -f webm_chunk -header "./media/video_360.hdr" -chunk_start_index 1 "./media/video_360_%d.chk" \
    -map 1:0 -c:a libopus -mapping_family 255 -b:a 1024k -vn -ar 48000 \
    -f webm_chunk -audio_chunk_duration 2000 -header "./media/audio_171.hdr" -chunk_start_index 1 "./media/audio_171_%d.chk"