import $ from 'jquery';
import 'dashjs';
import videojs from 'video.js';
import './dependencies/videojs-vr.min.js';
import * as ambisonics from 'ambisonics';
import MatrixMultiplier from './dependencies/MatrixMultiplier.js';
import {zoom, zoomfactors} from './dependencies/zoom.js';
import './css/video-js.css';

var order,
		chCounts,	// how many channels per file (including empty LFE channels)
		chStrings, // strings describing contained audio channels (excluding empty LFE channels)
		nrActiveAudioPlayers,
		irs = "irs/mls_o4_rev.wav",
		mediaUrl,
    audioElements = [],
		audioPlayers = [],
		sourceNodes = [],
		channelSplitters = [],
		allBuffersLoaded = false,
		audioSetupComplete = false,
		videoSetupComplete = false,
		wasPaused = true,
		waitingForPlayback = false,
		context, order, channelMerger, rotator, multiplier, sound, decoder,
		viewAzim, viewElev, hoabuffer, masterGain, numCh;

var maxOrder = 4;
var tracksPerAudioPlayer = 7;
var maxNrOfAudioPlayers = Math.ceil((maxOrder + 1) * (maxOrder + 1) / tracksPerAudioPlayer);

// create as many audio players as we need for max order
for (let i = 0; i < maxNrOfAudioPlayers; ++i) {
	audioElements[i] = new Audio();
	audioPlayers[i] = dashjs.MediaPlayer().create();
}

var videoPlayer = videojs('videojs-player');
videoPlayer.vr({projection: '360'});
console.log(videoPlayer);
console.log(videoPlayer.vr());

export function initialize(newMediaUrl, newOrder) {
	order = newOrder;
	mediaUrl = newMediaUrl;
	setOrderDependentVariables();

	videoPlayer.src({type: 'application/dash+xml', src: mediaUrl + '/video.mpd'});
	// videoPlayer = videojs('videojs-player', {
	// 	sources: [{
	//     src: mediaUrl + '/video.mpd',
	//     type: 'application/dash+xml'
	//   }],
	// 	html5: {
	//     nativeCaptions: false // get rid of weird safari error...
	//   }
	// });

	for (let i = 0; i < nrActiveAudioPlayers; ++i) {
		audioPlayers[i].initialize(audioElements[i], mediaUrl + "audio_" + chStrings[i] + ".mpd", false);
	  // console.log(audioPlayers[i]);
	  // console.log(audioPlayers[i].getVideoElement());
	}

	videoPlayer.ready(function() {
		console.log("video player ready");

		// prevent play before everything is set up correctly
		var tech = videoPlayer.tech({ IWillNotUseThisInPlugins: true });
		tech.off("mouseup");
		videoPlayer.bigPlayButton.off("click");
	});

	videoPlayer.vr().on( "initialized", function() {
		startSetup();
		handleEvents();
	});
}

function handleEvents() {
	// first we need to get control over playback
	console.log(videoPlayer.vr().canvasPlayerControls);
	var canvControls = videoPlayer.vr().canvasPlayerControls;
	canvControls.canvas.removeEventListener('mouseup', canvControls.onMoveEnd);

	canvControls.canvas.addEventListener("mouseup", function() {
		console.log("canvas mouseup");
		// play if everything ready, pause if playing
		if (readyForPlayback() || !videoPlayer.paused()) {
			canvControls.onMoveEnd();
		}
		else if (!readyForPlayback()) {
			console.log("not yet ready for playback");
			waitingForPlayback = true;
			videoPlayer.addClass("vjs-seeking"); // show loading spinner
			videoPlayer.bigPlayButton.hide();
			wasPaused = false;
			tryResumePlayback();
		}
	})

	videoPlayer.bigPlayButton.on("click", function() {
		if (!readyForPlayback()) {
			console.log("not yet ready for playback");
			waitingForPlayback = true;
			videoPlayer.addClass("vjs-seeking"); // show loading spinner
		}
		this.hide();
		wasPaused = false;
		tryResumePlayback();
	});

	// now make sure that audio and video always starts in sync and waits for each other when loading
	for (let i in audioPlayers) {
		audioPlayers[i].on(dashjs.MediaPlayer.events["CAN_PLAY"], function() {
			console.log("audio canplay");
			tryResumePlayback();
		});

		audioPlayers[i].on(dashjs.MediaPlayer.events["BUFFER_LOADED"], function() {
			console.log("audio buffer loaded");
			if (waitingForPlayback)
				tryResumePlayback();
		});

		audioPlayers[i].on(dashjs.MediaPlayer.events["PLAYBACK_WAITING"], function() {
			console.log("audio waiting");
			startWaitingRoutine();
		});

		audioPlayers[i].on(dashjs.MediaPlayer.events["PLAYBACK_SEEKING"], function() {
			console.log("audio seeking");
			startWaitingRoutine();
		});
	}

	videoPlayer.on("play", function() {
		console.log("play");

		for (let i in audioPlayers) {
			audioPlayers[i].play();
		}
	});

	// resume context only on first play event
	videoPlayer.one("play", function() {
		if (context.state !== "running") {
			context.resume();
			console.log("resuming context");
		}
	});

	videoPlayer.on("pause", function() {
		console.log("pause");
		for (let i in audioPlayers) {
			audioPlayers[i].pause();
		}
	});

	videoPlayer.on("seeking", function() {
		console.log("seeking!");
		startWaitingRoutine();

		for (let i in audioPlayers) {
			audioPlayers[i].seek(this.currentTime());
		}
	});

	videoPlayer.on("waiting", function() {
		console.log("waiting");
		startWaitingRoutine();
	});

	videoPlayer.on("canplay", function(event) {
		console.log("video canplay");
		tryResumePlayback();
	});

	videoPlayer.on("volumechange", function() {
		if (masterGain)
			masterGain.gain.value = this.volume();
	});

	videoPlayer.on("playing", function() {
		console.log("playing");
		wasPaused = false;
		waitingForPlayback = false;
		videoPlayer.removeClass("vjs-seeking"); // remove loading spinner
	});

	videoPlayer.on("loadeddata", function() {
		console.log("loaded video data");
	});
}

function startWaitingRoutine() {
	if (!waitingForPlayback) {
		waitingForPlayback = true;
		wasPaused = videoPlayer.paused();
		videoPlayer.pause();
		videoPlayer.addClass("vjs-seeking"); // show loading spinner
	}
}

//resume playback if audio and video is ready
function tryResumePlayback() {
	// console.log(videoPlayer.paused());
	// console.log("wasPaused:"+wasPaused);
	// console.log("videoPlayer.paused(): "+videoPlayer.paused());
	// console.log("videoPlayer.readyState(): "+videoPlayer.readyState());
	// console.log("audio all ready states:"+audioPlayers.every(p => p.getVideoElement().readyState === 4));
	if (readyForPlayback() && !wasPaused && videoPlayer.paused()) {
		console.log("resuming playback");
		videoPlayer.play();
	} else if (!readyForPlayback() && !wasPaused) {
		console.log("WAITING!");
		videoPlayer.addClass("vjs-seeking"); // show loading spinner
		console.log("videoPlayer.readyState(): "+videoPlayer.readyState());
		console.log("audio all ready states:"+audioPlayers.every(p => p.getVideoElement().readyState === 4));
		console.log("allBuffersLoaded:"+allBuffersLoaded);
	} else if (!readyForPlayback){
		console.log("not ready for playback yet");
	} else if (wasPaused) {
		console.log("no need to hurry: playback was paused");
	} else if (!videoPlayer.paused()) {
		console.log("playback is running - no problem here?");
	}
}

function readyForPlayback() {
	if (videoPlayer.readyState() >= 3
			&& audioPlayers.every(p => p.getVideoElement().readyState === 4)
			&& allBuffersLoaded)
			return true;
	else
			return false;
}

function startSetup() {
	if (!audioSetupComplete && !videoSetupComplete) {
		setupAudio();
		setupVideo();
	}
}

// var prev1 = document.getElementById( 'prev1' );
//var prev2 = document.getElementById( 'prev2' );
//var prev3 = document.getElementById( 'prev3' );

function setupAudio() {
	console.log("setup audio!");
	allBuffersLoaded = false;

	var AudioContext = window.AudioContext // Default
									|| window.webkitAudioContext; // safari
	context = new AudioContext;
	console.log(context);

	// this is needed to enable WAA with Safari, still if used in combination with dash.js this is not enough...
	// unlockAudioContext(context);

	channelMerger = context.createChannelMerger(numCh);
	console.log(channelMerger);

	// initialize ambisonic rotator
	rotator = new ambisonics.sceneRotator(context, order);
	console.log(rotator);

	// initialize matrix multiplier (for now use always 4th order as zoom matrix is in 4th order format)
	multiplier = new MatrixMultiplier(context, 4);
	console.log(multiplier);

	decoder = new ambisonics.binDecoder(context, order);
	console.log(decoder);

	var loader_filters = new ambisonics.HOAloader(context, order, irs, buffer => {
		decoder.updateFilters(buffer);
		allBuffersLoaded = true;
		tryResumePlayback();
	});
	loader_filters.load();

	masterGain = context.createGain();
	masterGain.gain.value = 1.0;

	for (let i in audioPlayers) {
		channelSplitters[i] = context.createChannelSplitter(chCounts[i]);
		sourceNodes[i] = context.createMediaElementSource(audioElements[i]);
		sourceNodes[i].channelCount = chCounts[i];
		// console.log($("#audio_" + chStrings[i])[0]);
		// console.log(sourceNodes[i]);
		sourceNodes[i].connect(channelSplitters[i]);
	}

	connectChannels();

	channelMerger.connect(rotator.in);
	rotator.out.connect(multiplier.in);
	multiplier.out.connect(decoder.in);
	decoder.out.connect(masterGain);
	masterGain.connect(context.destination);

	audioSetupComplete = true;
}

function setupVideo() {
	console.log("setup video");
	var vidControls = videoPlayer.vr().controls3d;

	vidControls.orbit.minDistance = -700;
	vidControls.orbit.maxDistance = 200;
	console.log(vidControls);

	// this.controls3d.orbit.on( .. ) does not work for custom events!
	vidControls.orbit.addEventListener("change", function() { // view change
		// console.log("change!");
		viewAzim = this.getAzimuthalAngle() * 180 / Math.PI;
		viewElev = -90 + this.getPolarAngle() * 180 / Math.PI;
		// console.log(viewAzim);
		// console.log(viewElev);
		rotator.yaw = viewAzim;
		rotator.pitch = viewElev;
		rotator.updateRotMtx();
	});

	vidControls.orbit.addEventListener("zoom", function() { // zoom change
		// console.log("zoom!");
		//console.log(this.currentDistance);
		//console.log("zoom factor = " + zoom_factor)
		if (this.currentDistance <= 0) {
			let zoom_factor = Math.pow(2, -this.currentDistance/500);

			for (let zz = 0;  zz < zoomfactors.length ; zz++) {
				if (zoom_factor > zoomfactors[zoomfactors.length-zz-1]) {
					multiplier.updateMtx(zoom[zoomfactors.length-zz-1]);
					break;
				}
			}
		} else {
			multiplier.updateMtx(zoom[0]);
		}
	});

	videoSetupComplete = true;
}

function connectChannels() {
	// console.log(navigator.userAgent);

	// firefox does not do channel remapping of 7ch files: 3 1 2 6 7 4 5 8, 22 23 24 25
	// this is useful for testing of channel order:
	// channelSplitters[0].connect(channelMerger, 0, 0);
	// channelMerger.connect(context.destination);

	let channelMapping7ch = [];

  if (navigator.userAgent.indexOf("Chrome") != -1 )
  {
  	console.log("Chrome");
		channelMapping7ch = [0, 1, 2, -1, 3, 4, 5, 6];
  }
  else if(navigator.userAgent.indexOf("Safari") != -1)
  {
  	console.error("Safari NOT SUPPORTED YET");
		channelMapping7ch = [1, 2, 0, 5, 6, 3, 4, -1];
  }
  else if(navigator.userAgent.indexOf("Firefox") != -1 )
  {
  	console.log("Firefox");
		channelMapping7ch = [1, 2, 0, 5, 6, 3, 4, -1];
		// let firefoxChannelMapping4ch = [0, 1, 2, 3];
		// let firefoxChannelMapping2ch = [0, 1];

  }
  else
  {
  	console.error("Unsupported browser detected, player might not work as expected!");
  }

	let totalChannelCount = 0;
	for (let i = 0; i < nrActiveAudioPlayers; ++i) {
		for (let ch = 0; ch < chCounts[i]; ++ch) {
			if (chCounts[i] === 8) {
				if (channelMapping7ch[ch] === -1) // channel is empty LFE channel, we can leave it out
					continue;

				// console.log("in: "+channelMapping7ch[ch]+", out: "+totalChannelCount);

				channelSplitters[i].connect(channelMerger, channelMapping7ch[ch], totalChannelCount);
			} else {
				// no remapping needed
				channelSplitters[i].connect(channelMerger, ch, totalChannelCount);
			}

			++totalChannelCount;
		}
	}

}

function setOrderDependentVariables() {
	numCh = (order + 1) * (order + 1);

	switch(order) {
	  case 4:
			chCounts = [8, 8, 8, 4];
			chStrings = ["01-07ch", "08-14ch", "15-21ch", "22-25ch"];
			nrActiveAudioPlayers = 4;
	    break;
	  case 3:
			chCounts = [8, 8, 2];
			chStrings = ["01-07ch", "08-14ch", "15-16ch"];
			nrActiveAudioPlayers = 3;
	    break;
		case 2:
			chCounts = [8, 2];
			chStrings = ["01-07ch", "08-9ch"];
			nrActiveAudioPlayers = 2;
			break;
		case 1:
			chCounts = [4];
			chStrings = ["01-04ch"];
			nrActiveAudioPlayers = 1;
	  default:
	    console.error("Error: Unsupported ambisonics order, choose order between 1 and 4.");
	}

}
