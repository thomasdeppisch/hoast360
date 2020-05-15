#!/bin/sh

echo 'enter name of source audio (wav) file without file extension:'
read infn

echo 'enter ambisonics order:'
read ambiorder

echo 'enter name of source video file with file extension:'
read vidfn

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
ffmpeg -i '../videos/'$vidfn -r 25 -c:v libvpx-vp9 -s 360x180 -b:v 500k -keyint_min 150 -g 150 -speed 1 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$outfn'_360_500k.webm'
ffmpeg -i '../videos/'$vidfn -r 25 -c:v libvpx-vp9 -s 720x360 -b:v 1000k -keyint_min 150 -g 150 -speed 1 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$outfn'_720_1000k.webm'
ffmpeg -i '../videos/'$vidfn -r 25 -c:v libvpx-vp9 -s 1080x540 -b:v 3000k -keyint_min 150 -g 150 -speed 1 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$outfn'_1080_3000k.webm'
ffmpeg -i '../videos/'$vidfn -r 25 -c:v libvpx-vp9 -s 1440x720 -b:v 4000k -keyint_min 150 -g 150 -speed 1 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$outfn'_1440_4000k.webm'
ffmpeg -i '../videos/'$vidfn -r 25 -c:v libvpx-vp9 -s 2560x1280 -b:v 6000k -keyint_min 150 -g 150 -speed 1 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$outfn'_2560_6000k.webm'
#ffmpeg -i '../videos/'$vidfn -r 25 -c:v libvpx-vp9 -s 3840x1920 -b:v 10000k -keyint_min 150 -g 150 -speed 1 -tile-columns 4 -frame-parallel 1 -an -f webm -dash 1 $outdir'/'$outfn'_3840_3000k.webm'

############################# audio, non-live, without chunks #############################
# chunks created internally!
ffmpeg \
    -i '../sounds/wavs/'$infn'.wav' \
    -c:a libopus -mapping_family 255 -b:a $audiobitrate'k' -vn -f webm -dash 1 $outdir'/'$outfn'.webm'

############################# CREATE DASH MANIFESTS #############################

ffmpeg \
    -f webm_dash_manifest -i $outdir'/'$outfn'_360_500k.webm' \
    -f webm_dash_manifest -i $outdir'/'$outfn'_720_1000k.webm' \
    -f webm_dash_manifest -i $outdir'/'$outfn'_1080_3000k.webm' \
    -f webm_dash_manifest -i $outdir'/'$outfn'_1440_4000k.webm' \
    -f webm_dash_manifest -i $outdir'/'$outfn'_2560_6000k.webm' \
    -c copy -map 0 -map 1 -map 2 -map 3 -map 4 \
    -f webm_dash_manifest \
    -adaptation_sets 'id=0,streams=0,1,2,3,4' \
    $outdir'/video.mpd'

ffmpeg -f webm_dash_manifest -i $outdir'/'$outfn'.webm' -c copy -map 0 -f webm_dash_manifest -adaptation_sets 'id=0,streams=0' $outdir'/audio.mpd'
