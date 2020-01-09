# hoast360

360 degree video player with dynamic binaural higher-order ambisonics rendering, depending on view direction and zoom factor.

This is still a work-in-progress.

----------


### file preparations

MPEG DASH streaming, use of the Web Audio API and higher-order Ambisonic processing require the following file properties:

 - video encoding: h264 codec, mp4 container
 - audio encoding: aac coded, m4a container
 - Ambisonics content: ambix standard, maximum 4th order
 - audio files need to be split into 8 channel files using the naming convention below, with the 4th channel empty (thanks to aac 7.1 audio channel specifications and automatic low-pass filtering on the LFE channel)
	 - e.g. for 4th order Ambisonics we need 25 ch audio, split up into 7+7+7+4-channel files, contained in 8-channel aac files with the 4th channel empty
 - dash streaming: one dash manuscript (mpd) needs to be created for the video content, and one dash manuscript for *each* audio file
	 - video: the manuscript needs to be named *video.mpd*
	 
	 - audio: to be found correctly, the dash audio manuscripts are required to be named *audio_01-07ch.mpd*, *audio_08-16ch.mpd*, *audio_17-21ch.mpd* and *audio_22-25ch.mpd* (for 4th-order Ambisonics, adapt accordingly for different orders) 
	 - all the manuscript files need to be placed in the same folder, with the folder being inside the *media* folder

To generate the described files, the following *ffmpeg* and *mp4Box* commands can be used:

 - create 8ch aac audio via ffmpeg (repeat this for all audio files): `ffmpeg -i audiofilename_01-07ch.wav -c:a aac -b:a 320k -vn audiofilename_01-07ch.m4a`
 - create higher-bitrate video via ffmpeg: `ffmpeg -i videofilename.mov -preset slow -tune film -vsync passthrough -write_tmcd 0 -an -c:v libx264 -x264opts 'keyint=25:min-keyint=25:no-scenecut' -crf 22  -maxrate 5000k -bufsize 10000k -pix_fmt yuv420p -f mp4 -movflags frag_keyframe+empty_moov+default_base_moof videofilename_5000.mp4`
 - create lower-bitrate video via ffmpeg: `ffmpeg -i videofilename.mov -preset slow -tune film -vsync passthrough -write_tmcd 0 -an -c:v libx264 -x264opts 'keyint=25:min-keyint=25:no-scenecut' -crf 23  -maxrate 2000k -bufsize 4000k -pix_fmt yuv420p -f mp4 -movflags frag_keyframe+empty_moov+default_base_moof videofilename_2000.mp4`
 - create dashed audio via mp4Box (repeat this for all audio files): `MP4Box -dash 2000 -rap -frag-rap -bs-switching no -profile "dashavc264:live" audiofilename_01-07ch.m4a -out audio_01-07ch.mpd`
 - create dashed video via mp4Box: `MP4Box -dash 2000 -rap -frag-rap  -bs-switching no -profile "dashavc264:live" videofilename_5000.mp4 videofilename_2000.mp4 -out video.mpd`


