//
//  HoastProcessor.cpp
//  hoastProcessor
//
//  Created by Thomas Deppisch on 29.01.20.
//  Copyright © 2020 Thomas Deppisch. All rights reserved.
//

#include "HoastProcessor.h"

HoastProcessor::HoastProcessor() {}

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

void HoastProcessor::calcRotationMatrix (const int order, float yaw_rad, float pitch_rad)
{
    auto ca = std::cos(yaw_rad);
    auto cb = std::cos(pitch_rad);
    auto sa = std::sin(yaw_rad);
    auto sb = std::sin(pitch_rad);

    Matrix<float> rotMat (3, 3);
    rotMat(0, 0) = ca * cb;
    rotMat(1, 0) = sa * cb;
    rotMat(2, 0) = -sb;
    rotMat(0, 1) = -sa;
    rotMat(1, 1) = ca;
    rotMat(2, 1) = 0.0f;
    rotMat(0, 2) = ca * sb;
    rotMat(1, 2) = sa * sb;
    rotMat(2, 2) = cb;

    // first order rotation matrix
    auto r1 = orderMatrices[1];

    r1->operator() (0, 0) = rotMat(1, 1);
    r1->operator() (0, 1) = rotMat(1, 2);
    r1->operator() (0, 2) = rotMat(1, 0);
    r1->operator() (1, 0) = rotMat(2, 1);
    r1->operator() (1, 1) = rotMat(2, 2);
    r1->operator() (1, 2) = rotMat(2, 0);
    r1->operator() (2, 0) = rotMat(0, 1);
    r1->operator() (2, 1) = rotMat(0, 2);
    r1->operator() (2, 2) = rotMat(0, 0);

    for (int l = 2; l <= order; ++l)
    {
        auto Rone = orderMatrices[1];
        auto Rlm1 = orderMatrices[l - 1];
        auto r1 = orderMatrices[l];
        for (int m = -l; m <= l; ++m)
        {
            for (int n = -l; n <= l; ++n)
            {
                const int d = (m == 0) ? 1 : 0;
                double denom;
                if (abs(n) == l)
                    denom = (2 * l) * (2 * l - 1);
                else
                    denom = l * l - n * n;

                double u = sqrt((l * l - m * m) / denom);
                double v = sqrt((1.0 + d) * (l + abs(m) - 1.0) * (l + abs(m)) / denom) * (1.0 - 2.0 * d) * 0.5;
                double w = sqrt((l - abs(m) - 1.0) * (l - abs(m)) / denom) * (1.0 - d) * (-0.5);

                if (u != 0.0)
                    u *= U (l, m, n, *Rone, *Rlm1);
                if (v != 0.0)
                    v *= V (l, m, n, *Rone, *Rlm1);
                if (w != 0.0)
                    w *= W (l, m, n, *Rone, *Rlm1);

                r1->operator() (m + l, n + l) = u + v + w;
            }
        }
    }
}

double HoastProcessor::P (int i, int l, int a, int b, Matrix<float>& R1, Matrix<float>& Rlm1)
{
    double ri1 = R1 (i + 1, 2);
    double rim1 = R1 (i + 1, 0);
    double ri0 = R1 (i + 1, 1);

    if (b == -l)
        return ri1 * Rlm1(a + l - 1, 0) + rim1 * Rlm1(a + l - 1, 2 * l - 2);
    else if (b == l)
        return ri1 * Rlm1(a + l - 1, 2 * l - 2) - rim1 * Rlm1(a + l-1, 0);
    else
        return ri0 * Rlm1(a + l - 1, b + l - 1);
};

double HoastProcessor::U (int l, int m, int n, Matrix<float>& Rone, Matrix<float>& Rlm1)
{
    return P (0, l, m, n, Rone, Rlm1);
}

double HoastProcessor::V (int l, int m, int n, Matrix<float>& Rone, Matrix<float>& Rlm1)
{
    if (m == 0)
    {
        auto p0 = P (1, l, 1, n, Rone, Rlm1);
        auto p1 = P (-1 , l, -1, n, Rone, Rlm1);
        return p0 + p1;
    }
    else if (m > 0)
    {
        auto p0 = P (1, l, m - 1, n, Rone, Rlm1);
        if (m == 1) // d = 1;
            return p0 * sqrt (2);
        else // d = 0;
            return p0 - P (-1, l, 1 - m, n, Rone, Rlm1);
    }
    else
    {
        auto p1 = P (-1, l, -m - 1, n, Rone, Rlm1);
        if (m == -1) // d = 1;
            return p1 * sqrt (2);
        else // d = 0;
            return p1 + P (1, l, m + 1, n, Rone, Rlm1);
    }
}

double HoastProcessor::W (int l, int m, int n, Matrix<float>& Rone, Matrix<float>& Rlm1)
{
    if (m > 0)
    {
        auto p0 = P (1, l, m + 1, n, Rone, Rlm1);
        auto p1 = P (-1, l, -m - 1, n, Rone, Rlm1);
        return p0 + p1;
    }
    else if (m < 0)
    {
        auto p0 = P(1, l, m - 1, n, Rone, Rlm1);
        auto p1 = P (-1, l, 1 - m, n, Rone, Rlm1);
        return p0 - p1;
    }

    return 0.0;
}