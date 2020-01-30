//
//  HoastProcessor.cpp
//  hoastProcessor
//
//  Created by Thomas Deppisch on 29.01.20.
//  Copyright © 2020 Thomas Deppisch. All rights reserved.
//

#include "HoastProcessor.h"
#include <math.h>
#include <stdio.h>

HoastProcessor::HoastProcessor(int new_order) :
  order(new_order), numShChannels((new_order + 1) + (new_order + 1)), rotMtxRowColSize(numShChannels - 1)
{
  // we do not need to rotate zeroth-order -> array size ((N+1)^2 - 1) x ((N+1)^2 - 1)
  shRotationMatrix = new float[rotMtxRowColSize * rotMtxRowColSize];
}

HoastProcessor::~HoastProcessor() {
  delete[] shRotationMatrix;
}

void HoastProcessor::Process(uintptr_t input_ptr, uintptr_t output_ptr, unsigned channel_count)
{
  float* input_buffer = reinterpret_cast<float*>(input_ptr);
  float* output_buffer = reinterpret_cast<float*>(output_ptr);

  for (unsigned channel = 0; channel < channel_count; ++channel) {
    float* destination = output_buffer + channel * kRenderQuantumFrames;
    float* source = input_buffer + channel * kRenderQuantumFrames;
    for (int smp = 0; smp < kRenderQuantumFrames; ++smp) {
      *(destination + smp) = 0.5f * *(source + smp);
    }

    //memcpy(destination, source, kBytesPerChannel);
  }
}

void HoastProcessor::calcRotationMatrix(float yaw_rad, float pitch_rad)
{
    float ca = cosf(yaw_rad);
    float cb = cosf(pitch_rad);
    float sa = sinf(yaw_rad);
    float sb = sinf(pitch_rad);

    // first-order rotation matrix is directly related to cartesian rotation matrix (yaw-pitch-roll, zyx convention)
    shRotationMatrix[0] = ca;
    shRotationMatrix[1] = 0.0f;
    shRotationMatrix[2] = sa;
    shRotationMatrix[0 + rotMtxRowColSize] = sa * sb;
    shRotationMatrix[1 + rotMtxRowColSize] = cb;
    shRotationMatrix[2 + rotMtxRowColSize] = ca * sb;
    shRotationMatrix[0 + 2 * rotMtxRowColSize] = -sa * cb;
    shRotationMatrix[1 + 2 * rotMtxRowColSize] = sb;
    shRotationMatrix[2 + 2 * rotMtxRowColSize] = ca * cb;

    for(int i = 0; i < rotMtxRowColSize; i++) {
        for(int j = 0; j < rotMtxRowColSize; j++) {
            printf("%f ", shRotationMatrix[j + i * rotMtxRowColSize]);
        }
        printf("\n");
    } 

    // for (int l = 2; l <= order; ++l)
    // {
    //     auto Rone = orderMatrices[1];
    //     auto Rlm1 = orderMatrices[l - 1];
    //     auto r1 = orderMatrices[l];
    //     for (int m = -l; m <= l; ++m)
    //     {
    //         for (int n = -l; n <= l; ++n)
    //         {
    //             const int d = (m == 0) ? 1 : 0;
    //             double denom;
    //             if (abs(n) == l)
    //                 denom = (2 * l) * (2 * l - 1);
    //             else
    //                 denom = l * l - n * n;

    //             double u = sqrt((l * l - m * m) / denom);
    //             double v = sqrt((1.0 + d) * (l + abs(m) - 1.0) * (l + abs(m)) / denom) * (1.0 - 2.0 * d) * 0.5;
    //             double w = sqrt((l - abs(m) - 1.0) * (l - abs(m)) / denom) * (1.0 - d) * (-0.5);

    //             if (u != 0.0)
    //                 u *= U (l, m, n, *Rone, *Rlm1);
    //             if (v != 0.0)
    //                 v *= V (l, m, n, *Rone, *Rlm1);
    //             if (w != 0.0)
    //                 w *= W (l, m, n, *Rone, *Rlm1);

    //             r1->operator() (m + l, n + l) = u + v + w;
    //         }
    //     }
    // }
}

// double HoastProcessor::P (int i, int l, int a, int b, Matrix<float>& R1, Matrix<float>& Rlm1)
// {
//     double ri1 = R1 (i + 1, 2);
//     double rim1 = R1 (i + 1, 0);
//     double ri0 = R1 (i + 1, 1);

//     if (b == -l)
//         return ri1 * Rlm1(a + l - 1, 0) + rim1 * Rlm1(a + l - 1, 2 * l - 2);
//     else if (b == l)
//         return ri1 * Rlm1(a + l - 1, 2 * l - 2) - rim1 * Rlm1(a + l-1, 0);
//     else
//         return ri0 * Rlm1(a + l - 1, b + l - 1);
// };

// double HoastProcessor::U (int l, int m, int n, Matrix<float>& Rone, Matrix<float>& Rlm1)
// {
//     return P (0, l, m, n, Rone, Rlm1);
// }

// double HoastProcessor::V (int l, int m, int n, Matrix<float>& Rone, Matrix<float>& Rlm1)
// {
//     if (m == 0)
//     {
//         auto p0 = P (1, l, 1, n, Rone, Rlm1);
//         auto p1 = P (-1 , l, -1, n, Rone, Rlm1);
//         return p0 + p1;
//     }
//     else if (m > 0)
//     {
//         auto p0 = P (1, l, m - 1, n, Rone, Rlm1);
//         if (m == 1) // d = 1;
//             return p0 * sqrt (2);
//         else // d = 0;
//             return p0 - P (-1, l, 1 - m, n, Rone, Rlm1);
//     }
//     else
//     {
//         auto p1 = P (-1, l, -m - 1, n, Rone, Rlm1);
//         if (m == -1) // d = 1;
//             return p1 * sqrt (2);
//         else // d = 0;
//             return p1 + P (1, l, m + 1, n, Rone, Rlm1);
//     }
// }

// double HoastProcessor::W (int l, int m, int n, Matrix<float>& Rone, Matrix<float>& Rlm1)
// {
//     if (m > 0)
//     {
//         auto p0 = P (1, l, m + 1, n, Rone, Rlm1);
//         auto p1 = P (-1, l, -m - 1, n, Rone, Rlm1);
//         return p0 + p1;
//     }
//     else if (m < 0)
//     {
//         auto p0 = P(1, l, m - 1, n, Rone, Rlm1);
//         auto p1 = P (-1, l, 1 - m, n, Rone, Rlm1);
//         return p0 - p1;
//     }

//     return 0.0;
// }