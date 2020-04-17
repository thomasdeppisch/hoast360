#!/bin/sh

ffmpeg -y -f webm_dash_manifest -live 1 -i './media/video_360.hdr' \
    -f webm_dash_manifest -live 1 -i './media/audio_171.hdr' \
    -map 0:v -c:v copy -f webm_dash_manifest -live 1 -adaptation_sets "id=0,streams=0" \
    -chunk_start_index 1 -chunk_duration_ms 5000 -time_shift_buffer_depth 7200 -minimum_update_period 7200 './media/video.mpd' \
    -map 1:a -c:a copy -f webm_dash_manifest -live 1 -adaptation_sets "id=0,streams=0" \
    -chunk_start_index 1 -chunk_duration_ms 5000 -time_shift_buffer_depth 7200 -minimum_update_period 7200 './media/audio.mpd' \
