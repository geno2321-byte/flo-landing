/**
 * 플로 채널 랜딩 신청 · 니치 질문지 수신 (261014 — 병원 랜딩과 시트 분리, src 열 추가)
 *
 * 이 파일은 script.google.com 프로젝트 「제목 없는 프로젝트」(시트 묶음)의 사본이다.
 * 라이브가 정본이고 이 파일은 대조용이다. 260903 버전 4 배포와 일치한다(NOTIFY_EMAIL = flowads.official).
 *
 * 설치
 *  1) 구글 스프레드시트 새로 만들기
 *  2) 확장 프로그램 > Apps Script > 이 코드 전체를 붙여넣기
 *  3) 아래 NOTIFY_EMAIL에 알림 받을 주소를 넣는다(비워두면 메일 안 감)
 *  4) 배포 > 새 배포 > 유형 "웹 앱"
 *       실행 계정: 나
 *       액세스 권한: 모든 사용자
 *  5) 나온 주소(.../exec)를 랜딩 HTML의 ENDPOINT에 넣는다
 *
 * 코드를 고친 뒤에는 반드시 "배포 관리 > 편집 > 버전: 새 버전"으로 다시 배포해야
 * 바뀐 내용이 적용된다. 주소는 그대로 유지된다.
 */

var NOTIFY_EMAIL = "flowads.official@gmail.com";

// 텔레그램 알림. @BotFather로 봇을 만들어 받은 토큰과 chat_id를 넣는다.
// 둘 중 하나라도 비어두면 텔레그램으로는 안 보낸다(메일은 그대로 간다).
var TG_TOKEN = '';
var TG_CHAT  = '';

// 시트에서 [확장 프로그램 > Apps Script]로 들어왔다면 비워둔다.
// script.google.com에서 새 프로젝트로 만들었다면 시트 ID를 넣는다.
// 시트 ID는 주소창의 /d/ 와 /edit 사이 긴 문자열이다.
var SHEET_ID = '';

var APPLY_COLS = ['ts','rid','src','from','stage','name','tel','email','url',
                  'goal','goal_etc','biz','area','etc','memo','agree','biz_name','blog','insta','place'];
var QUIZ_COLS  = ['ts','rid','q1','q2','q3','q4','q5','q6'];

function doPost(e){
  try{
    var d = JSON.parse(e.postData.contents);
    var quiz = (d.type === 'quiz');
    var cols = quiz ? QUIZ_COLS : APPLY_COLS;
    var sheet = getSheet(quiz ? '질문지' : '신청', cols);

    d.ts = new Date();
    sheet.appendRow(cols.map(function(c){ return d[c] === undefined ? '' : d[c]; }));

    if(!quiz && NOTIFY_EMAIL){
      MailApp.sendEmail(NOTIFY_EMAIL,
        '[플로 채널 랜딩] 신규 신청 — ' + (d.name || '이름없음'),
        ['접수번호: ' + d.rid,
         '성함: ' + d.name, '상호: ' + (d.biz_name || '없음'),
         '연락처: ' + d.tel,
         '이메일: ' + d.email,
         '업종: ' + d.biz + ' / ' + d.area,
         '채널: ' + (d.url || '없음'),
         '목적: ' + d.goal + (d.goal_etc ? ' (' + d.goal_etc + ')' : ''),
         '',
         '고민: ' + d.memo].join('\n'));
    }

    if(!quiz && TG_TOKEN && TG_CHAT){
      notifyTelegram(d);
    }

    return json({ok:true, rid:d.rid});
  }catch(err){
    return json({ok:false, error:String(err)});
  }
}

// 텔레그램이 죽어도 시트 기록과 메일은 살려야 하므로 예외를 삼킨다.
function notifyTelegram(d){
  try{
    var text = ['[플로 채널 랜딩 신청] ' + (d.name || '이름없음'),
                '연락처: ' + d.tel,
                '상호: ' + (d.biz_name || '없음'),
                '업종: ' + d.biz + ' / ' + d.area,
                '목적: ' + (d.goal || ''),
                '',
                '고민: ' + (d.memo || '')].join(String.fromCharCode(10));
    UrlFetchApp.fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
      method: 'post',
      payload: { chat_id: TG_CHAT, text: text },
      muteHttpExceptions: true
    });
  }catch(err){}
}

// 배포 직후 한 번 실행해 텔레그램으로 시험 알림이 오는지 확인한다.
// 실행해도 시트에 기록되거나 메일이 가지 않는다.
function testTelegram(){
  if(!TG_TOKEN || !TG_CHAT){
    throw new Error('TG_TOKEN 또는 TG_CHAT이 비어 있다');
  }
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
    method: 'post',
    payload: { chat_id: TG_CHAT, text: '[시험] 랜딩 알림 연결 확인' },
    muteHttpExceptions: true
  });
  Logger.log(res.getContentText());
}

// 배포가 살아 있는지 브라우저로 확인할 때 쓴다.
function doGet(){
  return json({ok:true, note:'alive'});
}

function getSheet(name, cols){
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID)
                    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if(!sheet){
    sheet = ss.insertSheet(name);
    sheet.appendRow(cols);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
