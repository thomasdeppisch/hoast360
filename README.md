# HOAST360

HOAST360 is the open-source, higher-order Ambisonics, 360° video player with acoustic zoom. HOAST360 dynamically outputs a binaural audio stream from up to fourth-order Ambisonics audio content.  
You can try out HOAST360 at the [HOAST Library](https://hoast.iem.at).

Technical details are explained in an [AES eBrief](http://www.aes.org/e-lib/browse.cfm?elib=20828).

> Thomas Deppisch (University of Technology, University of Music and Performing Arts, Graz)
>
> thomas.deppisch@student.tugraz.at
>
> Nils Meyer-Kahlen (Aalto Acoustics Lab)
>
> nils.meyer-kahlen@aalto.fi
>
----------
### Manipulate the Field-Of-View (FOV)
HOAST360 provides two ways to manipulate the audio-visual FOV. Drag on the video canvas with your mouse to rotate the FOV. Use your mouse wheel to zoom in and out, visually as well as acoustically. HOAST360 directly outputs a binaural audio stream, expecting the listener to **_wear headphones_**!

### VR Ready
HOAST360 supports HMDs via the WebXR Device API and an XR polyfill. This will work in recent versions of Firefox and Chromium-based (Chrome, Opera, Edge, ...) browsers. When an HMD is detected, HOAST360 automatically displays a small VR-toggle in the lower right to activate the XR environment. So far tested with Oculus Rift and HTC Vive.

For Chromium-based browsers the following flags must be set via chrome://flags for WebXR to work:
 - enable #webxr
 - set the correct runtime via #webxr-runtime
 - disable #xr-sandbox

### Using HOAST360
First, create a video-js HTML element with id 'hoast360-player' as a home for the player. Then, simply import the current HOAST360 bundle from the 'dist/' folder via a script tag and initialize it with the path to your DASH manifest mpd, the path to the decoding filters and the Ambisonics order. You can find the decoding filters in this repository under 'irs/'. Ambisonic orders 1 to 4 are supported.
```html
<video-js id='hoast360-player' class='video-js vjs-fluid vjs-big-play-centered ' controls preload='auto' crossorigin="anonymous" data-setup='{}'>
    <p class='vjs-no-js'>
        To view this video please enable JavaScript, and consider upgrading to a web browser that
        <a href='https://videojs.com/html5-video-support/' target='_blank'>supports HTML5 video</a>
    </p>
</video-js>

<script src="//path/to/hoast360.bundle.js"></script>
<script>
    var hoast360 = new HOAST360();
    var ambisonicsOrder = 4;
    hoast360.initialize("./path/to/media/manifest.mpd", "./path/to/irs/", ambisonicsOrder);
</script>
```
Whenever you want to load a new source, make sure to reset HOAST360 using
```html
<script>
    hoast360.reset();
</script>
```
before initializing with the new media path like above. The above steps are also done in index.html, you can use this file for a jump start. For development, we recommend using a development server to prevent cross-origin resource sharing (CORS) errors. Note that some development servers create an error 'required tag not found'. In this case please use a different development server, we recommend this simple [node server](https://www.npmjs.com/package/http-server). If you deploy HOAST360 to a webserver you might need to use an absolute path for the irs, i.e.
```hoast360.initialize("./path/to/media/manifest.mpd", "https://mywebsite.com/path/to/irs/", ambisonicsOrder);```

### Codec Considerations
HOAST360 uses MPEG-DASH, and supports video files using H.264 or VP8/VP9. For audio files the OPUS codec is chosen, as it is the only lossy codec supporting multichannel files, which is available in most browsers (not in Safari, see below). Video and audio files are packaged in the webm container for streaming via DASH. The following ffmpeg commands have proven to be effective for encoding media. Adapt the commands according to your needs.

Transcode video to webm (VP9, DASH):
```
ffmpeg -i <videoInputFileName> -r 25 -c:v libvpx-vp9 -s 1440x720 -b:v 1800k -minrate 900k -maxrate 2610k -crf 31 -quality good -keyint_min 150 -g 150 -speed 1 -tile-columns 2 -frame-parallel 1 -an -f webm -dash 1 <videoOututFileName.webm>
```
Transcode multichannel wav audio file to multichannel OPUS in webm container, we recommend a bitrate of 64 kbit/channel/s:
```
ffmpeg \
    -i <audioInputFileName.wav> \
    -c:a libopus -mapping_family 255 -b:a 1600k -vn -f webm -dash 1 <audioOutputFileName.webm>
```
Join audio and video:
```
ffmpeg -i <videoOututFileName.webm> -i <audioOutputFileName.webm> -c copy <audioVideoJoined.webm>
```

Create DASH manifest:
```
ffmpeg -f webm_dash_manifest -i <audioVideoJoined.webm> -c copy -map 0 -f webm_dash_manifest -adaptation_sets 'id=0,streams=0' manifest.mpd
```

### Known Issues
- The combination of 360° video rendering and dynamic higher-order Ambisonics binaural rendering is computationally demanding, which is why HOAST360 will not work on mobile devices and on some older computers. Always make sure to use a recent version of Firefox or a Chromium-based browser (Chrome, Opera, Edge, ...). At the moment we recommend Firefox, as it yielded the best results in our tests. If playback is not smooth, consider lowering the video quality by using the settings dropdown menu of the player. Lowering the video quality will NOT impair audio quality.

- HOAST360 does not work in Safari due to lacking OPUS support.

- If you encounter a playback error in Chrome (VIDEOJS: ERROR: (CODE:4 MEDIA_ERR_SRC_NOT_SUPPORTED)), it might be due to video meta data. Playback should work if you remove side data, such as 'stereo3d' and 'spherical' information. You can remove such meta data by copying with ffmpeg:
```
ffmpeg -i input_video_with_metadata.mov -c:v copy -an output_video_without_metadata.mov
```

----------
### Developing with HOAST360
For development, using the node package manager [npm](https://www.npmjs.com/) is recommended. After installation of npm, go to the directory of the HOAST360 sources and type `npm install` in the command line. This will install all the required dependencies for development. After changing a source file, type `npm run build` to create a new development build, or `npm run production-build` for a fully-optimized production build. The bundles are generated using webpack and can be found in the 'dist/' folder. You can start a development server using `npm start`.

### Related repositories
HOAST360 is built upon the open-source video player [video.js](https://videojs.com/), the DASH framework [dash.js](https://github.com/Dash-Industry-Forum/dash.js/wiki) and some of the Ambisonics processing is based on [JSAmbisonics](https://github.com/polarch/JSAmbisonics).

### License
HOAST360 is released under GNU GPLv3.
