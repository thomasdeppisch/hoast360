# createEnergyVideo.py
# creates energy visualization of input ambisonics file (ACN, SN3D)
# uses max re decoding weights
#
# call via command line:
# python3 createEnergyVideo.py INFILE.wav
# or
# python3 createEnergyVideo.py INFILE.wav DYNAMIC_RANGE_DB
# or
# python3 createEnergyVideo.py INFILE.wav DYNAMIC_RANGE_DB NUM_FRAMES
#
# td 2020
# %%
import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.animation as manimation
import wavio
import spaudiopy as spa
from scipy.interpolate import griddata
from datetime import datetime

#%%
nargin = len(sys.argv)
if (nargin < 2):
    print('provide audio file name as first argument and (optionally) dynamic range in db and number of frames to render')
elif (nargin < 3):
    fn = sys.argv[1]
    numFrames = np.inf
    dyndB = 20
elif (nargin < 4):
    fn = sys.argv[1]
    numFrames = np.inf
    dyndB = int(sys.argv[2])
else:
    fn = sys.argv[1]
    numFrames = int(sys.argv[3])
    dyndB = int(sys.argv[2])

#%%
printDebug = True

wav = wavio.read(fn)
#wav = wavio.read('noise_circ.wav')
data = wav.data
dataNorm = data / pow(2, int(wav.sampwidth * 8) - 1)
fs = wav.rate
numCh = data.shape[1]
order = int(np.sqrt(numCh) - 1)
numSmp = data.shape[0]

#%%
sn3d2n3d = np.array([
    1.0000000000000000,
    1.7320508075688772,
    1.7320508075688772,
    1.7320508075688772,
    2.2360679774997898,
    2.2360679774997898,
    2.2360679774997898,
    2.2360679774997898,
    2.2360679774997898,
    2.6457513110645907,
    2.6457513110645907,
    2.6457513110645907,
    2.6457513110645907,
    2.6457513110645907,
    2.6457513110645907,
    2.6457513110645907,
    3.0000000000000000,
    3.0000000000000000,
    3.0000000000000000,
    3.0000000000000000,
    3.0000000000000000,
    3.0000000000000000,
    3.0000000000000000,
    3.0000000000000000,
    3.0000000000000000,
    3.3166247903553998,
    3.3166247903553998,
    3.3166247903553998,
    3.3166247903553998,
    3.3166247903553998,
    3.3166247903553998,
    3.3166247903553998,
    3.3166247903553998,
    3.3166247903553998,
    3.3166247903553998,
    3.3166247903553998,
    3.6055512754639891,
    3.6055512754639891,
    3.6055512754639891,
    3.6055512754639891,
    3.6055512754639891,
    3.6055512754639891,
    3.6055512754639891,
    3.6055512754639891,
    3.6055512754639891,
    3.6055512754639891,
    3.6055512754639891,
    3.6055512754639891,
    3.6055512754639891,
    3.8729833462074170,
    3.8729833462074170,
    3.8729833462074170,
    3.8729833462074170,
    3.8729833462074170,
    3.8729833462074170,
    3.8729833462074170,
    3.8729833462074170,
    3.8729833462074170,
    3.8729833462074170,
    3.8729833462074170,
    3.8729833462074170,
    3.8729833462074170,
    3.8729833462074170,
    3.8729833462074170])

maxre = spa.sph.max_rE_weights(order)
weights = np.zeros((numCh))

for o in range(order+1):
    for m in range(-o, o+1):
        idx = o**2 + o + m
        weights[idx] = sn3d2n3d[idx] * maxre[o]

#%%
tdesign = np.loadtxt('Design_5200_100_random.dat')
tdAzim = tdesign[:,0]
tdZen = tdesign[:,1]
# range -pi..pi
tdAzim[tdAzim > np.pi] = -2*np.pi + tdAzim[tdAzim > np.pi]

Yt = spa.sph.sh_matrix(order, tdAzim, tdZen, 'real')

tdAzimDeg = tdAzim * 180 / np.pi
tdZenDeg = tdZen * 180 / np.pi
gridRes = 1
xgv = np.linspace(-180, 180, int(360 / gridRes))
ygv = np.linspace(0, 180, int(180 / gridRes))
[xGrid, yGrid] = np.meshgrid(xgv, ygv)
xGridFlat = xGrid.flatten('F')
yGridFlat = yGrid.flatten('F')

#%%
dpi = 100
fps = 25

fig = plt.figure(frameon=False, dpi=dpi, figsize=(14.4, 7.2))
plt.axis('off')
ax = fig.add_axes([0,0,1,1])
ax.axis('off')
ax.margins(0)
plt.gca().invert_yaxis()
plt.gca().invert_xaxis()
canvas_width, canvas_height = fig.canvas.get_width_height()

#ytest = spa.sph.sh_matrix(order, np.pi/4, np.pi/2, 'real')

# calculate gains in 200ms windows
numFrames = min(numFrames, int(numSmp / fs * fps))
winLenSmp = int(0.2 * fs)
frameLen = int(1 / fps * fs)

# find rather loud point for normalization
maxIdx = np.argmax(np.sum(np.abs(data), axis=1))
maxRMS = np.dot(Yt, np.transpose(dataNorm[maxIdx - int(winLenSmp / 2) : np.minimum(maxIdx + int(winLenSmp / 2) - 1, numSmp), :] * weights)) 
maxRMSdB = 10 * np.log10(np.max(np.sqrt(np.mean(maxRMS * maxRMS, axis=1))))

#%%
oldTime = datetime.now()

def update(frame):
    global oldTime

    if (printDebug & ((frame % (10 * fps)) == 0)):
        now = datetime.now()
        timeNeededFor1SecRendered = now - oldTime
        print('starting frame ' + str(frame) + ', dt/10s: ' + str(timeNeededFor1SecRendered))
        oldTime = now

    currData = dataNorm[frame * frameLen : np.minimum(frame * frameLen + winLenSmp, numSmp), :] * weights
    tdGains = np.dot(Yt, np.transpose(currData))
    tdGainsRMS = np.sqrt(np.mean(tdGains * tdGains, axis=1))
    #tdGainsRMS = np.dot(Yt, np.transpose(ytest))
    tdGainsdB = 10 * np.log10(tdGainsRMS) - maxRMSdB

    # bring to range 0..1
    tdGainsdB = np.maximum(tdGainsdB / dyndB + 1, 0)
    tdGainsdB = np.minimum(tdGainsdB, 1)

    # interpolate to regular grid
    tdGainsGrid = griddata(np.transpose(np.array([tdAzimDeg, tdZenDeg])), tdGainsdB, 
                            np.transpose(np.array([xGridFlat, yGridFlat])))

    # fill nans with nearest neighbour
    nans = np.isnan(tdGainsGrid)
    notnans = np.logical_not(nans)
    tdGainsGrid[nans] = griddata(np.transpose(np.array([xGridFlat[notnans], yGridFlat[notnans]])), tdGainsGrid[notnans], 
                                    np.transpose(np.array([xGridFlat[nans], yGridFlat[nans]])), method='nearest')

    tdGainsGridMtx = np.reshape(tdGainsGrid, (xGrid.shape[0], xGrid.shape[1]), 'F')
    im.set_array(tdGainsGridMtx.ravel())
    #im = plt.pcolormesh(tdGainsGridMtx, vmin=0, vmax=1)
    #fig.colorbar(im)
    return im

im = plt.pcolormesh(np.zeros((xGrid.shape[0], xGrid.shape[1])), vmin=0, vmax=1)
ani = manimation.FuncAnimation(fig, update, frames=numFrames, interval=1000/fps)

fnSplit = fn.replace('/', '.')
fnSplit = fnSplit.split('.')
ani.save(fnSplit[len(fnSplit) - 2] + '.mp4')


# %%
