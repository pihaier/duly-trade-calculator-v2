function onEditTrigger(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;

  // '설문지 응답 시트1'에서만 실행하고, 새 행이 추가될 때만 작동
  if (sheet.getName() !== '설문지 응답 시트1' || range.getRow() === 1) {
    return;
  }
  
  // A열(타임스탬프)에 값이 입력되었을 때만 실행 (새 행으로 간주)
  if (range.getColumn() === 1 && range.getValue() !== '') {
    runTranslationForNewRow(sheet, range.getRow());
  }
} 