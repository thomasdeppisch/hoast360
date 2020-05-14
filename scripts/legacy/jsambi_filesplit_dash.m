% split HOA audio file to multiple files, include silent channel depending
% on options

clear all

path = '../sounds/wavs/';
filename = '2015_VokalTotal.wav';
order = 4;
[sig,fs] = audioread([path,filename]);

nonSilentChannels = 8;
nChPerFile = 8;
nSilentChannelsPerFile = nChPerFile - nonSilentChannels;
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
            zeros(nSmp, nSilentChannelsPerFile), sig(:,str2double(nStart)+3:str2double(nEnd))];
    else
        sigPart = sig(:,str2double(nStart):str2double(nEnd));
    end
    
    audiowrite([path,fname,'_',nStart,'-',nEnd,'ch.',ftype],sigPart,fs);
end