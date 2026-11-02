/// <reference path="../pb_data/types.d.ts" />

// An event may not end before it starts.
onRecordValidate((e) => {
  const start = e.record.getDateTime("start");
  const end = e.record.getDateTime("end");
  if (!start.isZero() && !end.isZero() && end.before(start)) {
    throw new BadRequestError("종료 시각은 시작 시각보다 빠를 수 없습니다.");
  }
  e.next();
}, "events");
