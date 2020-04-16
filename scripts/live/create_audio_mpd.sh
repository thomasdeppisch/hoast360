#!/bin/sh

ffmpeg -re -f webm_dash_manifest -live 1 -i './media/audio_171.hdr' -c copy -map 0 \
-f webm_dash_manifest -live 1 -adaptation_sets "id=0,streams=0" \
-chunk_start_index 1 -chunk_duration_ms 2000 -time_shift_buffer_depth 7200 -minimum_update_period 7200 './media/audio_25ch.mpd'
