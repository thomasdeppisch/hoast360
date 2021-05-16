# HOAST360

HOAST360 is the open-source, higher-order Ambisonics, 360° video player with acoustic zoom. HOAST360 dynamically outputs a binaural audio stream from up to fourth-order Ambisonics audio content.  
You can try out HOAST360 at the [HOAST Library](https://hoast.iem.at).

Technical details are explained in an [AES eBrief](http://www.aes.org/e-lib/browse.cfm?elib=20828).

> Thomas Deppisch (Applied Acoustics division at Chalmers University of Technology, Gothenburg)
>
> thomas.deppisch@chalmers.se
>
> Nils Meyer-Kahlen (Aalto Acoustics Lab)
>
> nils.meyer-kahlen@aalto.fi
>
----------
### Manipulate the Field-Of-View (FOV)
HOAST360 provides two ways to manipulate the audio-visual FOV. Drag on the video canvas with your mouse to rotate the FOV. Use your mouse wheel to zoom in and out, visually as well as acoustically. HOAST360 directly outputs a binaural audio stream, expecting the listener to **_wear headphones_**!

### VR Ready
HOAST360 supports HMDs via the WebXR Device API and an XR polyfill employed in [videojs-xr](https://github.com/thomasdeppisch/videojs-xr). This will work in recent versions of Firefox and Chromium-based (Chrome, Opera, Edge, ...) desktop browsers as well as the Oculus browser and the Firefox VR browser. When an HMD is detected, HOAST360 automatically displays a small VR-toggle in the lower right to activate the XR environment. So far tested with Oculus Rift, HTC Vive and Oculus Quest.

For Chromium-based desktop browsers the following flags must be set via chrome://flags for WebXR to work:
 - enable #webxr
 - set the correct runtime via #webxr-runtime
 - disable #xr-sandbox

### Using HOAST360
First, create a video-js HTML element with id 'hoast360-player' as a home for the player. Then, simply import the current HOAST360 bundle from the 'dist/' folder via a script tag and initialize it with the path to your media folder containing an audio and a video MPEG DASH manifest file (see below), the path to the decoding filters and the Ambisonics order. You can find the decoding filters in this repository under 'irs/'. Ambisonic orders 1 to 4 are supported.
```html
<video-js id='hoast360-player' class='video-js vjs-fluid vjs-big-play-centered ' controls preload='auto' crossorigin="anonymous" data-setup='{}'>
    <p class='vjs-no-js'>
        To view this video please enable JavaScript, and consider upgrading to a web browser that
        <a href='https://videojs.com/html5-video-support/' target='_blank'>supports HTML5 video</a>
    </p>
</video-js>

<script src="path/to/hoast360.bundle.js"></script>
<script>
    var hoast360 = new HOAST360();
    var ambisonicsOrder = 4;
    hoast360.initialize("path/to/media/", "path/to/irs/", ambisonicsOrder);
</script>
```
Whenever you want to load a new source, make sure to reset HOAST360 using
```html
<script>
    hoast360.reset();
</script>
```
before initializing with the new media path like above. The above steps are also done in index.html, you can use this file for a jump start. For development, we recommend using a development server to prevent cross-origin resource sharing (CORS) errors. Note that some development servers create an error 'required tag not found'. In this case please use a different development server, we recommend this simple [node server](https://www.npmjs.com/package/http-server). If you deploy HOAST360 to a webserver you might need to use an absolute path for the irs, i.e.
```hoast360.initialize("path/to/media/", "https://mywebsite.com/path/to/irs/", ambisonicsOrder);```

### Codec Considerations
HOAST360 uses MPEG-DASH, and supports video files using H.264 or VP8/VP9. For audio files the OPUS codec is chosen, as it is the only lossy codec supporting multichannel files, which is available in most browsers (not in Safari, see below). Video and audio files are packaged in the webm container for streaming via DASH. The media folder HOAST360 is initialized with is supposed to contain two MPEG DASH manifest files: One called 'video.mpd' containing the required information of the video DASH stream, and one called 'audio.mpd' containing the information for the audio stream. The following ffmpeg commands have proven to be effective for encoding the media. Adapt the commands (especially regarding audio/video resolution, bitrate, etc.) according to your needs.

Transcode video to webm (VP9, DASH):
```
ffmpeg -i <videoInputFileName> -r 25 -c:v libvpx-vp9 -s 1440x720 -b:v 1800k -minrate 900k -maxrate 2610k -crf 31 -quality good -keyint_min 150 -g 150 -speed 1 -tile-columns 2 -frame-parallel 1 -an -f webm -dash 1 <videoOututFileName.webm>
```
Transcode multichannel wav audio file to multichannel OPUS in webm container, we recommend a bitrate of 64 kbit/channel/s (this example assumes a 4th-order Ambisonics, i.e. 25 channel input wav file):
```
ffmpeg -i <audioInputFileName.wav> \
    -c:a libopus -mapping_family 255 -b:a 1600k -vn -f webm -dash 1 <audioOutputFileName.webm>
```

Create DASH manifest for the video file, note that HOAST360 will always expect the video manifest to be called 'video.mpd':
```
ffmpeg -f webm_dash_manifest -i <videoOututFileName.webm> \
       -c copy -map 0 \
       -f webm_dash_manifest \
       -adaptation_sets "id=0,streams=0" \
       video.mpd
````
Create DASH manifest for audio file, HOAST360 will expect the manifest to be called 'audio.mpd':
```
ffmpeg -f webm_dash_manifest -i <audioFileName.webm> -c copy -map 0 -f webm_dash_manifest -adaptation_sets "id=0,streams=0" audio.mpd
```

### Known Issues
- The combination of 360° video rendering and dynamic higher-order Ambisonics binaural rendering is computationally demanding, which is why HOAST360 will not work on mobile devices and on some older computers. Always make sure to use a recent version of Firefox or a Chromium-based browser (Chrome, Opera, Edge, ...). At the moment we recommend Firefox, as it yielded the best results in our tests. If playback is not smooth, consider lowering the video quality by using the settings dropdown menu of the player. Lowering the video quality will NOT impair audio quality.

- HOAST360 does not work in Safari due to missing OPUS support.

- If you encounter a playback error in Chrome (VIDEOJS: ERROR: (CODE:4 MEDIA_ERR_SRC_NOT_SUPPORTED)), it might be due to video meta data. Playback should work if you remove side data, such as 'stereo3d' and 'spherical' information. You can remove such meta data by copying with ffmpeg:
```
ffmpeg -i input_video_with_metadata.mov -c:v copy -an output_video_without_metadata.mov
```

----------
### Developing with HOAST360
For development, using the node package manager [npm](https://www.npmjs.com/) is recommended. After installation of npm, go to the directory of the HOAST360 sources and type `npm install` in the command line. This will install all the required dependencies for development. After changing a source file, type `npm run build` to create a new development build, or `npm run production-build` for a fully-optimized production build. The bundles are generated using webpack and can be found in the 'dist/' folder. You can start a development server using `npm start`.

----------
###  Using the HOAST360 binaural decoder in WebAudio API projects
The binaural decoder used by HOAST360 is based on the one from [JSAmbisonics](https://github.com/polarch/JSAmbisonics) but is adapted to work with our [decoding filters](https://github.com/thomasdeppisch/hoast360/tree/master/irs). You can use the [binaural decoder](https://github.com/thomasdeppisch/hoast360/blob/master/dependencies/HoastBinauralDecoder.js) in any Web Audio API project independent of HOAST360. To use the binaural decoder you need to initialize it with your audio context and the ambisonics order (currently supporting orders 1 to 4). Then load the [decoding filters](https://github.com/thomasdeppisch/hoast360/tree/master/irs) with the [HOASTloader](https://github.com/thomasdeppisch/hoast360/blob/master/dependencies/HoastLoader.js): 
```
var decoder = new HOASTBinDecoder(audioContext, ambisonicsOrder);
var loaderFilters = new HOASTloader(audioContext, ambisonicsOrder, pathToDecoderFilters, (foaBuffer, hoaBuffer) => {
    decoder.updateFilters(foaBuffer, hoaBuffer);
});
loaderFilters.load();
```
Finally integrate the decoder into your Web Audio API routing graph
```
someNode.connect(decoder.in);
decoder.out.connect(someOtherNode);
```
See also the `_setupAudio()` function in [hoast360.js](https://github.com/thomasdeppisch/hoast360/blob/master/hoast360.js).

----------
### Related repositories
HOAST360 is built upon the open-source video player [video.js](https://videojs.com/), the DASH framework [dash.js](https://github.com/Dash-Industry-Forum/dash.js/wiki) and some of the Ambisonics processing is based on [JSAmbisonics](https://github.com/polarch/JSAmbisonics).

### License
HOAST360 is released under GNU GPLv3.

### Acknowledgment
This work was partly funded by the vice rectorate for research of the University of Music and Performing Arts, Graz, within the framework of a knowledge transfer project. Furthermore, we would like to especially thank IOhannes Zmölnig, Matthias Frank, Franz Zotter and Daniel Rudrich from the Institute of Electronic Music and Acoustics (IEM), Graz, for their ongoing support, Benjamin Hofer for his great help and expertise in web development and Tomasz Zernicki and Tomasz Latka from Zylia for their encouragement in the early stages of this project!
