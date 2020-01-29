import 'audioworklet-polyfill';

"use strict";

var $ = require("jquery");

const AudioContext = window.AudioContext || window.webkitAudioContext;
const context = new AudioContext;
var playing = false;
var order = 4;
var chCounts = [], chStrings = [], nrOfAudioPlayers, numChannels;
setOrderDependentVariables();
var audioElements = [], sourceNodes = [], channelSplitters = [], channelMerger;
var soundUrl = './sounds/wavs/25ch_count_';

for (let i = 0; i < nrOfAudioPlayers; ++i) {
  audioElements[i] = new Audio();
  audioElements[i].src = soundUrl + chStrings[i] + '.wav';
  sourceNodes[i] = context.createMediaElementSource(audioElements[i]);
  sourceNodes[i].channelCount = chCounts[i];

  channelSplitters[i] = context.createChannelSplitter(chCounts[i]);
  sourceNodes[i].connect(channelSplitters[i]);
}

channelMerger = context.createChannelMerger(numChannels);
console.log(channelMerger);
connectChannels();

// Loads module script via AudioWorklet.
context.audioWorklet.addModule('./hoastProcessor/hoast-processor.wasmmodule.js').then(() => {
  // After the resolution of module loading, an AudioWorkletNode can be
  // constructed.
  let hoastWorkletNode = new AudioWorkletNode(context, 'hoast-worklet-processor',
                                            {
                                            "processorOptions": {
                                              "order": order,
                                              "samplerate": context.sampleRate
                                            }});
  // gainWorkletNode.channelCount = numChannels;
  // console.log(gainWorkletNode);
  // const orderParam = gainWorkletNode.parameters.get('azim');
  // orderParam.value = 3;
  // console.log(orderParam);

  // AudioWorkletNode can be interoperable with other native AudioNodes.
  channelMerger.connect(hoastWorkletNode).connect(context.destination);

});

$("#clickme").on("click", function() {
  console.log("clicked!");
  if (context.state !== "running")
    context.resume();

  if (!playing) {
    for (let i in audioElements)
      audioElements[i].play();

    playing = true;
  }
  else {
    for (let i in audioElements)
      audioElements[i].pause();

    playing = false;
  }
});

function setOrderDependentVariables() {
	numChannels = (order + 1) * (order + 1);

	switch(order) {
	  case 4:
			chCounts = [8, 8, 8, 4];
			chStrings = ["01-07ch", "08-14ch", "15-21ch", "22-25ch"];
			nrOfAudioPlayers = 4;
	    break;
	  case 3:
			chCounts = [8, 8, 2];
			chStrings = ["01-07ch", "08-14ch", "15-16ch"];
			nrOfAudioPlayers = 3;
	    break;
		case 2:
			chCounts = [8, 2];
			chStrings = ["01-07ch", "08-9ch"];
			nrOfAudioPlayers = 2;
			break;
		case 1:
			chCounts = [4];
			chStrings = ["01-04ch"];
			nrOfAudioPlayers = 1;
	  default:
	    console.error("Error: Unsupported ambisonics order, choose order between 1 and 4.");
	}
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
	for (let i = 0; i < nrOfAudioPlayers; ++i) {
		for (let ch = 0; ch < chCounts[i]; ++ch) {
			if (chCounts[i] === 8) {
				if (channelMapping7ch[ch] === -1) // channel is empty LFE channel, we can leave it out
					continue;

				channelSplitters[i].connect(channelMerger, channelMapping7ch[ch], totalChannelCount);
			} else {
				// no remapping needed
				channelSplitters[i].connect(channelMerger, ch, totalChannelCount);
			}

			++totalChannelCount;
		}
	}

}
