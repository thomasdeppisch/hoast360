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

#include "emscripten/bind.h"

using namespace emscripten;

const unsigned kRenderQuantumFrames = 128;
const unsigned kBytesPerChannel = kRenderQuantumFrames * sizeof(float);

// The "kernel" is an object that processes a audio stream, which contains
// one or more channels. It is supposed to obtain the frame data from an
// |input|, process and fill an |output| of the AudioWorkletProcessor.
//
//       AudioWorkletProcessor Input(multi-channel, 128-frames)
//                                 |
//                                 V
//                               Kernel
//                                 |
//                                 V
//       AudioWorkletProcessor Output(multi-channel, 128-frames)
//
// In this implementation, the kernel operates based on 128-frames, which is
// the render quantum size of Web Audio API.
class GainProcessor {
 public:
  GainProcessor() {}

  float currentGain = 0.5f;

  void Process(uintptr_t input_ptr, uintptr_t output_ptr,
               unsigned channel_count) {
    float* input_buffer = reinterpret_cast<float*>(input_ptr);
    float* output_buffer = reinterpret_cast<float*>(output_ptr);

    // Bypasses the data. By design, the channel count will always be the same
    // for |input_buffer| and |output_buffer|.
    for (unsigned channel = 0; channel < channel_count; ++channel) {
      float* destination = output_buffer + channel * kRenderQuantumFrames;
      float* source = input_buffer + channel * kRenderQuantumFrames;
      for (int smp = 0; smp < kRenderQuantumFrames; ++smp) {
        *(destination + smp) = currentGain * *(source + smp);
        // *(source + smp) = 0; // set all samples to zero
      }

      //memcpy(destination, source, kBytesPerChannel);
    }
  }

  void setGain(float new_gain) {
      printf("set gain to %f \n", new_gain);
      currentGain = new_gain;
  }
};

EMSCRIPTEN_BINDINGS(CLASS_GainProcessor) {
  class_<GainProcessor>("GainProcessor")
      .constructor()
      .function("process",
                &GainProcessor::Process,
                allow_raw_pointers())
      .function("setGain",
                &GainProcessor::setGain);
}
