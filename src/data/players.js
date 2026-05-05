import { generatePlayer } from '@/utils/players';
export const INITIAL_PLAYERS = [
  generatePlayer('p1','Marcus Johnson','FW',88,{goals:14,assists:6,shots:42,gamesPlayed:10,motm:4},['Rapid','Power Shot','First Touch'],{pace:91,shooting:89,passing:75,defending:35,physical:78,dribbling:86}),
  generatePlayer('p2','Kai Williams','FW',84,{goals:10,assists:8,shots:35,gamesPlayed:10,motm:2},['Finesse Shot','Technical','Chip Shot'],{pace:84,shooting:85,passing:80,defending:30,physical:72,dribbling:88}),
  generatePlayer('p3','Dev Patel','MF',86,{goals:5,assists:12,tackles:28,gamesPlayed:10,motm:3},['Tiki-Taka','Incisive Pass','Whipped Pass'],{pace:76,shooting:74,passing:92,defending:68,physical:73,dribbling:84}),
  generatePlayer('p4','Jordan Clarke','MF',82,{goals:3,assists:9,tackles:45,gamesPlayed:10,motm:2},['Press Proven','Relentless','Jockey'],{pace:80,shooting:68,passing:82,defending:76,physical:82,dribbling:75}),
  generatePlayer('p5','Tyrone Mitchell','MF',79,{goals:4,assists:7,tackles:32,gamesPlayed:10,motm:1},['Long Ball','Bruiser'],{pace:73,shooting:72,passing:78,defending:70,physical:85,dribbling:70}),
  generatePlayer('p6','Nathan Brooks','DF',85,{goals:2,assists:3,cleanSheets:6,tackles:58,gamesPlayed:10,motm:3},['Block','Intercept','Aerial'],{pace:72,shooting:45,passing:70,defending:90,physical:88,dribbling:58}),
  generatePlayer('p7','Remi Okafor','DF',83,{goals:1,assists:2,cleanSheets:5,tackles:52,gamesPlayed:10,motm:2},['Slide Tackle','Anticipate','Jockey'],{pace:78,shooting:40,passing:68,defending:88,physical:84,dribbling:55}),
  generatePlayer('p8','Leon Hart','DF',80,{goals:0,assists:4,cleanSheets:4,tackles:40,gamesPlayed:10,motm:1},['Block','Press Proven'],{pace:69,shooting:38,passing:72,defending:85,physical:80,dribbling:52}),
  generatePlayer('p9','Ethan Cole','GK',87,{saves:48,cleanSheets:6,gamesPlayed:10,motm:3},['Anticipate','Dead Ball'],{pace:55,shooting:30,passing:65,defending:42,physical:76,dribbling:40}),
  generatePlayer('p10','Zack Rivera','GK',78,{saves:32,cleanSheets:3,gamesPlayed:8,motm:1},['Quick Step'],{pace:52,shooting:28,passing:60,defending:38,physical:72,dribbling:35}),
  generatePlayer('p11','Ollie Spencer','FW',81,{goals:8,assists:5,shots:30,gamesPlayed:9,motm:2},['Acrobatic','Rapid'],{pace:88,shooting:82,passing:68,defending:28,physical:74,dribbling:83}),
  generatePlayer('p12','Chris Adeyemi','MF',77,{goals:2,assists:6,tackles:25,gamesPlayed:9,motm:0},['Tiki-Taka','First Touch'],{pace:74,shooting:66,passing:80,defending:65,physical:70,dribbling:78}),
  generatePlayer('p13','Sam Eze','DF',76,{goals:1,assists:1,cleanSheets:3,tackles:35,gamesPlayed:8,motm:0},['Bruiser','Aerial'],{pace:65,shooting:35,passing:62,defending:82,physical:86,dribbling:48}),
  generatePlayer('p14','Jamie Owusu','FW',80,{goals:7,assists:4,shots:28,gamesPlayed:9,motm:1},['Trivela','Technical'],{pace:82,shooting:81,passing:76,defending:32,physical:70,dribbling:85}),
];
