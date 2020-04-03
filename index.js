import $ from 'jquery';
import * as dashjs from 'dashjs';
import videojs from 'video.js';
import 'videojs-contrib-dash'
import './dependencies/videojs-xr.es.js';
import MatrixMultiplier from './dependencies/MatrixMultiplier.js';
import * as zoom from './dependencies/HoastZoom.js';
import PlaybackEventHandler from './dependencies/PlaybackEventHandler.js';
import HOASTloader from './dependencies/HoastLoader.js';
import HOASTBinDecoder from './dependencies/HoastBinauralDecoder.js';
import HOASTRotator from './dependencies/HoastRotator.js';
import './css/video-js.css';

"use strict";

var order,
    chString,
    irs,
    mediaUrl,
    audioElement,
    audioPlayer,
    sourceNode,
    audioSetupComplete = false,
    videoSetupComplete = false,
    xrActive = false,
    context, rotator, multiplier, decoder,
    masterGain, numCh, videoPlayer, playbackEventHandler;

var maxOrder = 4;
var opusSupport = true;

var AudioContext = window.AudioContext // Default
    || window.webkitAudioContext; // safari
context = new AudioContext;
console.log(context);

playbackEventHandler = new PlaybackEventHandler(context);

// create as many audio players as we need for max order
audioElement = new Audio();
checkOpusSupport();

// create sourceNodes and connect to splitters as we cannot disconnect and reuse these
// (error: HTMLMediaElement already connected ...)
sourceNode = context.createMediaElementSource(audioElement);

function checkOpusSupport() {
    if (audioElement.canPlayType('audio/ogg; codecs="opus"') === '') {
        opusSupport = false;
    }
}

export function initialize(newMediaUrl, newOrder) {
    let playerhtml = "<video-js id='videojs-player' class='video-js vjs-big-play-centered' controls preload='auto' crossorigin='anonymous' data-setup='{}'></video-js>";
    $('#playerdiv').append(playerhtml);
    videoPlayer = videojs('videojs-player', {
        html5: {nativeCaptions: false}
    });

    if (!opusSupport) {
        videoPlayer.error('Error: Your browser does not support the OPUS audio codec. Please use Firefox or Chrome-based browsers.');
        return;
    }

    videoPlayer.xr();
    console.log(videoPlayer);
    console.log(videoPlayer.xr());

    audioSetupComplete = false;
    videoSetupComplete = false;

    if (order > maxOrder)
        console.error('Ambisonic orders greater than 4 not supported!');

    order = newOrder;
    mediaUrl = newMediaUrl;
    setOrderDependentVariables();

    videoPlayer.src({ type: 'application/dash+xml', src: mediaUrl + '/video.mpd' });

    audioPlayer = dashjs.MediaPlayer().create();
    audioPlayer.initialize(audioElement);
    audioPlayer.setAutoPlay(false);
    audioPlayer.attachSource(mediaUrl + "/audio_" + chString + ".mpd");

    videoPlayer.xr().on("initialized", function () {
        console.log("xr initialized");
        startSetup();
        console.log(this);
        playbackEventHandler.initialize(videoPlayer, audioPlayer);
    });
}

export function stop() {
    if (!opusSupport) {
        videoPlayer.dispose();
        return;
    }

    playbackEventHandler.unregisterEvents();
    videoPlayer.pause();
    disconnectAudio();
    videoPlayer.xr().dispose();
    videoPlayer.dispose(); // this triggers an error "failed to remove source buffer from media source", but seems to work anyway
    audioPlayer.reset();
}

function disconnectAudio() {
    sourceNode.disconnect();
    rotator.out.disconnect();
    multiplier.out.disconnect();
    decoder.out.disconnect();
    masterGain.disconnect();
}

function startSetup() {
    if (!audioSetupComplete && !videoSetupComplete) {
        setupAudio();
        setupVideo();
    }
}

function setupAudio() {
    // initialize ambisonic rotator
    rotator = new HOASTRotator(context, order);
    console.log(rotator);

    // initialize matrix multiplier (for now use always 4th order as zoom matrix is in 4th order format)
    multiplier = new MatrixMultiplier(context, 4);
    console.log(multiplier);

    decoder = new HOASTBinDecoder(context, order);
    console.log(decoder);

    var loader_filters = new HOASTloader(context, order, irs, (foaBuffer, hoaBuffer) => {
        decoder.updateFilters(foaBuffer, hoaBuffer);
        playbackEventHandler.setAllBuffersLoaded(true);
    });
    loader_filters.load();

    masterGain = context.createGain();
    masterGain.gain.value = 1.0;

    videoPlayer.on("volumechange", function () {
        if (masterGain)
            masterGain.gain.value = this.volume();
    });

    sourceNode.channelCount = numCh;

    sourceNode.connect(rotator.in);
    rotator.out.connect(multiplier.in);
    multiplier.out.connect(decoder.in);
    decoder.out.connect(masterGain);
    masterGain.connect(context.destination);

    audioSetupComplete = true;
}

function setupVideo() {
    videoPlayer.xr().camera.rotation.order = 'YZX'; // in THREE Y is vertical axis! -> set to yaw-pitch-roll
    // console.log(videoPlayer.xr().camera);

    let vidControls = videoPlayer.xr().controls3d;
    vidControls.orbit.minDistance = -700;
    vidControls.orbit.maxDistance = 200;
    console.log(vidControls);

    // this.controls3d.orbit.on( .. ) does not work for custom events!
    // view change
    vidControls.orbit.addEventListener("change", function () { 
        if (xrActive)
            return;

        rotator.updateRotationFromCamera(videoPlayer.xr().camera.matrixWorld.elements);
    });

    // view change if HMD is used
    videoPlayer.xr().on("xrCameraUpdate", function () {
        // console.log('yaw: ' + this.camera.rotation.y * 180 / Math.PI);
        // console.log('pitch: ' + this.camera.rotation.z * 180 / Math.PI);
        // console.log('roll: ' + this.camera.rotation.x * 180 / Math.PI);

        // console.log(this.xrPose.leftViewMatrix);
        // console.log(this.xrPose.rightViewMatrix);
        // console.log(this.xrPose.poseModelMatrix);
        // console.log(this.xrPose.views[0].transform.matrix);
        // console.log(this.xrPose.views[0].projectionMatrix);

        if (!xrActive)
            return;

        rotator.updateRotationFromCamera(this.xrPose.views[0].transform.matrix);
    });

    vidControls.orbit.addEventListener("zoom", function () { // zoom change
        updateZoom();
    });

    videoPlayer.xr().on("xrSessionActivated", function () {
        xrActive = true;
        multiplier.bypass(true);
    });

    videoPlayer.xr().on("xrSessionDeactivated", function () {
        xrActive = false;
        multiplier.bypass(false);
        updateZoom();
        rotator.updateRotationFromCamera(this.camera.matrixWorld.elements);
    });

    videoSetupComplete = true;
}

function updateZoom() {
    // console.log("zoom!");
    // console.log("zoom factor = " + zoom_factor)
    let distance = videoPlayer.xr().controls3d.orbit.currentDistance;

    if (distance <= 0) {
        let currZoomFactor = Math.pow(2, -distance / 500);

        for (let zz = 0; zz < zoom.zoomFactors.length; zz++) {
            if (currZoomFactor > zoom.zoomFactors[zoom.zoomFactors.length - zz - 1]) {
                multiplier.updateMtx(zoom.zoomMtx[zoom.zoomFactors.length - zz - 1]);
                break;
            }
        }

    } else {
        multiplier.updateMtx(zoom.zoomMtx[0]);
    }
}

function setOrderDependentVariables() {
    numCh = (order + 1) * (order + 1);
    irs = 'staticfiles/mediadb/irs/hoast_o' + order + '.wav';
    chString = numCh.toString() + 'ch';
}
