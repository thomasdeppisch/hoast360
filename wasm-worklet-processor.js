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
      name: 'azim',
      defaultValue: 0,
      minValue: -180,
      maxValue: 180
    },{
      name: 'elev',
      defaultValue: 0,
      minValue: -90,
      maxValue: 90
    }];
  }

  constructor(options) {
    super();

    console.log("processor options: ");
    console.log(options);
    this._order = options.processorOptions.order;
    this._sampleRate = options.processorOptions.samplerate;
    this._calculateChannelCount();

    console.log('order: ' + this._order);
    console.log('channelCount: ' + this._channelCount);

    // Allocate the buffer for the heap access. Start with stereo, but it can
    // be expanded up to 32 channels.
    this._heapInputBuffer = new HeapAudioBuffer(Module, RENDER_QUANTUM_FRAMES,
                                                this._channelCount, MAX_CHANNEL_COUNT);
    this._heapOutputBuffer = new HeapAudioBuffer(Module, RENDER_QUANTUM_FRAMES,
                                                this._channelCount, MAX_CHANNEL_COUNT);

    this._kernel = new Module.GainProcessor();

    console.log(this);
  }

  /**
   * System-invoked process callback function.
   * @param  {Array} inputs Incoming audio stream.
   * @param  {Array} outputs Outgoing audio stream.
   * @param  {Object} parameters AudioParam data.
   * @return {Boolean} Active source flag.
   */
  process(inputs, outputs, parameters) {

    let input = inputs[0];
    let output = outputs[0];

    // parameters.azim

    if (this._channelCount !== input.length)
    {
      console.error('nr of input channels (' + input.length + ') does not match channelCount (' + this._channelCount + ')');
      return false;
    }

    // Prepare HeapAudioBuffer for the channel count change in the current
    // render quantum.
    // this._heapInputBuffer.adaptChannel(this._channelCount);
    // this._heapOutputBuffer.adaptChannel(this._channelCount);

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
    this._channelCount = (this._order + 1) * (this._order + 1);
  }

}


registerProcessor('wasm-worklet-processor', WASMWorkletProcessor);
