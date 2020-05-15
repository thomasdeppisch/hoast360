#!/bin/sh

echo 'enter name of source audio (wav) file without file extension:'
read infn

echo 'enter ambisonics order:'
read ambiorder

echo 'enter name of source video file with file extension:'
read vidfn

echo 'enter larger dimension of video resolution, e.g. for 1440x720px enter 1440'
read vidres

outfn=$infn'_o'$ambiorder

numchannels=$(((ambiorder + 1) * (ambiorder + 1)))
audiobitrate=$((64 * numchannels))

outdir='../media/'$outfn
mkdir $outdir

if [ "$vidfn" == "" ]; then
    echo "no video input - creating intensity video!"

    python3 'createEnergyVideo.py' '../sounds/wavs/'$infn'.wav'

    vidfn=$infn'.mp4'
    mv $infn'.mp4' '../videos/orig_'$vidfn

    # add logos <- does this work for every (2x1) video size?
    ffmpeg -i '../videos/orig_'$vidfn -i kug-iem-equirect.png -filter_complex "[0:v][1:v] overlay=0:0" '../videos/'$vidfn
fi

# copy once to get rid of spherical metadata which prevents playback in Chrome
mv '../videos/'$vidfn '../videos/orig_'$vidfn
ffmpeg -i '../videos/orig_'$vidfn -c:v copy -an '../videos/'$vidfn

############################# create thumbnail image #############################
ffmpeg -ss 00:00:02 -i '../videos/'$vidfn -vframes 1 -s 360x270 -q:v 5 $outdir'/thumbnail.jpg'

############################# create scaled videos #############################
ffmpeg -i '../videos/'$vidfn -r 25 -c:v libvpx-vp9 -s 720x360 -b:v 750k -minrate 375k -maxrate 1088k -crf 33 -quality good -keyint_min 150 -g 150 -speed 1 -tile-columns 1 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$outfn'_720.webm'
ffmpeg -i '../videos/'$vidfn -r 25 -c:v libvpx-vp9 -s 1080x540 -b:v 1024k -minrate 512k -maxrate 1485k -crf 32 -quality good -keyint_min 150 -g 150 -speed 1 -tile-columns 2 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$outfn'_1080.webm'
ffmpeg -i '../videos/'$vidfn -r 25 -c:v libvpx-vp9 -s 1440x720 -b:v 1800k -minrate 900k -maxrate 2610k -crf 31 -quality good -keyint_min 150 -g 150 -speed 1 -tile-columns 2 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$outfn'_1440.webm'
if (( $vidres > 1440 )); then
    ffmpeg -i '../videos/'$vidfn -r 25 -c:v libvpx-vp9 -s 2560x1280 -b:v 6000k -minrate 3000k -maxrate 8700k -crf 24 -quality good -keyint_min 150 -g 150 -speed 1 -tile-columns 3 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$outfn'_2560.webm'
fi
if (( $vidres > 2560 )); then
    ffmpeg -i '../videos/'$vidfn -r 25 -c:v libvpx-vp9 -s 3840x1920 -b:v 12000k -minrate 6000k -maxrate 17400k -crf 15 -quality good -keyint_min 150 -g 150 -speed 1 -tile-columns 3 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$outfn'_3840.webm'
fi

############################# audio, non-live, without chunks #############################
# chunks created internally!
ffmpeg \
    -i '../sounds/wavs/'$infn'.wav' \
    -c:a libopus -mapping_family 255 -b:a $audiobitrate'k' -vn -f webm -dash 1 $outdir'/'$outfn'.webm'

############################# CREATE DASH MANIFESTS #############################
if (( $vidres <= 1440 )); then
    ffmpeg \
        -f webm_dash_manifest -i $outdir'/'$outfn'_720.webm' \
        -f webm_dash_manifest -i $outdir'/'$outfn'_1080.webm' \
        -f webm_dash_manifest -i $outdir'/'$outfn'_1440.webm' \
        -c copy -map 0 -map 1 -map 2 \
        -f webm_dash_manifest \
        -adaptation_sets 'id=0,streams=0,1,2' \
        $outdir'/video.mpd'

elif (( $vidres <= 2560 )); then
    ffmpeg \
    -f webm_dash_manifest -i $outdir'/'$outfn'_720.webm' \
    -f webm_dash_manifest -i $outdir'/'$outfn'_1080.webm' \
    -f webm_dash_manifest -i $outdir'/'$outfn'_1440.webm' \
    -f webm_dash_manifest -i $outdir'/'$outfn'_2560.webm' \
    -c copy -map 0 -map 1 -map 2 -map 3 \
    -f webm_dash_manifest \
    -adaptation_sets 'id=0,streams=0,1,2,3' \
    $outdir'/video.mpd'

else
    ffmpeg \
    -f webm_dash_manifest -i $outdir'/'$outfn'_720.webm' \
    -f webm_dash_manifest -i $outdir'/'$outfn'_1080.webm' \
    -f webm_dash_manifest -i $outdir'/'$outfn'_1440.webm' \
    -f webm_dash_manifest -i $outdir'/'$outfn'_2560.webm' \
    -f webm_dash_manifest -i $outdir'/'$outfn'_3840.webm' \
    -c copy -map 0 -map 1 -map 2 -map 3 -map 4 \
    -f webm_dash_manifest \
    -adaptation_sets 'id=0,streams=0,1,2,3,4' \
    $outdir'/video.mpd'

fi

ffmpeg -f webm_dash_manifest -i $outdir'/'$outfn'.webm' -c copy -map 0 -f webm_dash_manifest -adaptation_sets 'id=0,streams=0' $outdir'/audio.mpd'
