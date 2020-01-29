//
//  HoastProcessor.h
//  hoastProcessor
//
//  Created by Thomas Deppisch on 29.01.20.
//  Copyright © 2020 Thomas Deppisch. All rights reserved.
//

#ifndef HoastProcessor_h
#define HoastProcessor_h

#include "emscripten/bind.h"

using namespace emscripten;

class HoastProcessor {
 public:
    HoastProcessor();

    void Process(uintptr_t input_ptr, uintptr_t output_ptr, unsigned channel_count);

  private:
    static const unsigned int kRenderQuantumFrames = 128;
    static const unsigned int kBytesPerChannel = kRenderQuantumFrames * sizeof(float);
};

EMSCRIPTEN_BINDINGS(CLASS_HoastProcessor) {
  class_<HoastProcessor>("HoastProcessor")
      .constructor()
      .function("process",
                &HoastProcessor::Process,
                allow_raw_pointers());
}


#endif /* HoastProcessor_h */
