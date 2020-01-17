import 'audioworklet-polyfill';
var $ = require("jquery");

const context = new AudioContext();
const oscillator = new OscillatorNode(context);
const splitter = context.createChannelSplitter(25);
let oscRunning = false;
console.log(context.audioWorklet);


$("#clickme").on("click", function() {
  console.log("clicked!");
  if (context.state !== "running")
    context.resume();

  if (!oscRunning) {
    oscillator.start();
    oscRunning = true;
  }
  else {
    oscillator.stop();
    oscRunning = false;
  }

})

// Loads module script via AudioWorklet.
context.audioWorklet.addModule('wasm-worklet-processor.js').then(() => {
  // After the resolution of module loading, an AudioWorkletNode can be
  // constructed.
  let gainWorkletNode = new AudioWorkletNode(context, 'wasm-worklet-processor');
  const orderParam = gainWorkletNode.parameters.get('order');
  orderParam.value = 3;
  console.log(orderParam);

  // AudioWorkletNode can be interoperable with other native AudioNodes.
  oscillator.connect(gainWorkletNode).connect(context.destination);

});
