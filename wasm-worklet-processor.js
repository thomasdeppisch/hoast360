/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */


/**
 * A simple demonstration of WASM-powered AudioWorkletProcessor.
 *
 * @class WASMWorkletProcessor
 * @extends AudioWorkletProcessor
 */
class WASMWorkletProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'order',
      defaultValue: 4,
      minValue: 1,
      maxValue: 4
    }];
  }

  constructor() {
    super();

    // Allocate the buffer for the heap access. Start with stereo, but it can
    // be expanded up to 32 channels.
    this._heapInputBuffer = new HeapAudioBuffer(Module, RENDER_QUANTUM_FRAMES,
                                                2, MAX_CHANNEL_COUNT);
    this._heapOutputBuffer = new HeapAudioBuffer(Module, RENDER_QUANTUM_FRAMES,
                                                 2, MAX_CHANNEL_COUNT);

    this._kernel = new Module.GainProcessor();

    this._order = 4;
    console.log('constructor!');
    this._calculateChannelCount();

  }

  /**
   * System-invoked process callback function.
   * @param  {Array} inputs Incoming audio stream.
   * @param  {Array} outputs Outgoing audio stream.
   * @param  {Object} parameters AudioParam data.
   * @return {Boolean} Active source flag.
   */
  process(inputs, outputs, parameters) {

    if (Number(parameters.order) !== this._order) {
      this._order = Number(parameters.order);
      this._calculateChannelCount();
      console.log(Number(parameters.order) === this._order);
    }


    // console.log("channelCount: " + this._channelCount);
    // console.log("inputLength: " + inputs.length);
    // console.log("inputs: " + inputs);
    // console.log("outputs: " + outputs);

    if (this._channelCount !== inputs.length)
      return false;

    let input = inputs[0];
    let output = outputs[0];

    // Prepare HeapAudioBuffer for the channel count change in the current
    // render quantum.
    this._heapInputBuffer.adaptChannel(this._channelCount);
    this._heapOutputBuffer.adaptChannel(this._channelCount);

    // Copy-in, process and copy-out.
    for (let channel = 0; channel < this._channelCount; ++channel) {
      this._heapInputBuffer.getChannelData(channel).set(input[channel]);
    }
    this._kernel.process(this._heapInputBuffer.getHeapAddress(),
                         this._heapOutputBuffer.getHeapAddress(),
                         this._channelCount);
    for (let channel = 0; channel < this._channelCount; ++channel) {
      output[channel].set(this._heapOutputBuffer.getChannelData(channel));
      // output[channel].set(this._heapInputBuffer.getChannelData(channel));
    }

    return true;
  }

  _calculateChannelCount() {
    console.log("_calculateChannelCount");
    // console.log("this._order: " + this._order);
    // let order = Number(this._order);
    this._channelCount = (this._order + 1) * (this._order + 1);
    this._channelCount = 1;
  }

}


registerProcessor('wasm-worklet-processor', WASMWorkletProcessor);
