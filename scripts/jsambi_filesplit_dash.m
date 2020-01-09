% split HOA audio file to multiple 8 channel files with 7 audio channels
% and one silent channel to be streamed via MPEG DASH using m4a container
% with AAC 7.1 profile -> LFE channel is silent
% (7.1 profile is the largest multichannel profile which is supported among
% many applications but the profile automatically applies a lowpass filter
% to the LFE channel)

% this time the fourth channel (=LFE) is supposed to be empty

clear all

path = '../sounds/wavs/';
filename = 'trelotechnika_ambix.wav';
order = 3;
[sig,fs] = audioread([path,filename]);

nonSilentChannels = 7;
nChPerFile = 8;
nCh = (order + 1)^2;
nFiles = ceil(nCh./nonSilentChannels);
nSmp = size(sig,1);

fsplit = strsplit(filename,'.');
fname = fsplit{1};
ftype = fsplit{2};

for ii=1:nFiles
    nStart = num2str((ii-1) * nonSilentChannels + 1);
    if length(nStart) < 2
        nStart = ['0',nStart];
    end
    nEnd = num2str(ii * nonSilentChannels);
    if (ii == nFiles)
        % last file
        nEnd = num2str(nCh);
    end
    if length(nEnd) < 2
        nEnd = ['0',nEnd];
    end
    
    if (ii ~= nFiles)
        sigPart = [sig(:,str2double(nStart):str2double(nStart)+2), ...
            zeros(nSmp, 1), sig(:,str2double(nStart)+3:str2double(nEnd))];
    else
        sigPart = sig(:,str2double(nStart):str2double(nEnd));
    end
    
    audiowrite([path,fname,'_',nStart,'-',nEnd,'ch.',ftype],sigPart,fs);
end