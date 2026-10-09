// ══════════════════════════════════════════════════════════════
//  PRECIFICACAO_Setup.gs
//  Execute a função setup() UMA VEZ para popular a planilha
//  de controle de precificação com os dados dos kits.
//
//  Passo a passo:
//  1. Abra a planilha no Google Sheets
//  2. Extensões → Apps Script
//  3. Cole este arquivo inteiro
//  4. Clique em ▶ Executar (função: setup)
//  5. Autorize quando pedir permissão
// ══════════════════════════════════════════════════════════════

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── ABA OnGrid ──────────────────────────────────────────────
  let og = ss.getSheetByName('OnGrid') || ss.insertSheet('OnGrid');
  og.clearContents();

  const ogHeaders = ['placas','inv','mod','equip','promo','src'];
  const ogData = [
    [4,'GoodWe 3kW','Jinko 620W',4800,'','ESTIMADO'],
    [4,'GoodWe 3kW','Leapton 600W',4520,'','ESTIMADO'],
    [5,'GoodWe 3kW','Jinko 620W',5300,'','ESTIMADO'],
    [5,'GoodWe 3kW','Leapton 600W',4950,'','ESTIMADO'],
    [6,'GoodWe 3kW','Jinko 620W',5800,'','ESTIMADO'],
    [6,'GoodWe 3kW','Leapton 600W',5380,'','ESTIMADO'],
    [7,'GoodWe 5kW','Jinko 620W',6900,'','ESTIMADO'],
    [7,'GoodWe 5kW','Leapton 600W',6410,'','ESTIMADO'],
    [8,'FoxESS Micro','Jinko 620W',7276,'','REAL'],
    [8,'GoodWe 5kW','Jinko 620W',7400,14380,'REAL'],
    [8,'FoxESS Micro','Leapton 600W',7514,'','REAL'],
    [8,'FoxESS Micro','Ronma 620W',7901,'','REAL'],
    [9,'GoodWe 5kW','Jinko 620W',7900,'','ESTIMADO'],
    [9,'GoodWe 5kW','Leapton 600W',7270,'','ESTIMADO'],
    [10,'GoodWe 5kW','Jinko 620W',8400,'','ESTIMADO'],
    [10,'GoodWe 5kW','Leapton 600W',7770,'','ESTIMADO'],
    [11,'GoodWe 7.5kW','Jinko 620W',12525,'','ESTIMADO'],
    [11,'GoodWe 7.5kW','Leapton 600W',11755,'','ESTIMADO'],
    [12,'FoxESS Micro','Jinko 620W',11800,'','ESTIMADO'],
    [12,'GoodWe 6kW','Jinko 620W',12121,21755,'REAL'],
    [12,'GoodWe 7.5kW','Leapton 600W',12185,'','ESTIMADO'],
    [12,'FoxESS Micro','Leapton 600W',11000,'','ESTIMADO'],
    [13,'GoodWe 7.5kW','Jinko 620W',13525,'','ESTIMADO'],
    [13,'GoodWe 7.5kW','Leapton 600W',12615,'','ESTIMADO'],
    [14,'GoodWe 7.5kW','Jinko 620W',14025,'','ESTIMADO'],
    [14,'GoodWe 7.5kW','Leapton 600W',13045,'','ESTIMADO'],
    [15,'GoodWe 10kW','Jinko 620W',15400,'','ESTIMADO'],
    [15,'GoodWe 10kW','Leapton 600W',14350,'','ESTIMADO'],
    [16,'GoodWe 7.5kW','Leapton 600W',13892,27800,'REAL'],
    [16,'GoodWe 7.5kW','Jinko 620W',15025,28990,'REAL'],
    [16,'FoxESS Micro','Jinko 620W',16000,30119,'REAL'],
    [16,'FoxESS Micro','Leapton 600W',14800,28799,'REAL'],
    [17,'GoodWe 10kW','Jinko 620W',16400,'','ESTIMADO'],
    [17,'GoodWe 10kW','Leapton 600W',15210,'','ESTIMADO'],
    [18,'GoodWe 10kW','Jinko 620W',16900,'','ESTIMADO'],
    [18,'GoodWe 10kW','Leapton 600W',15640,'','ESTIMADO'],
    [19,'GoodWe 10kW','Jinko 620W',17400,'','ESTIMADO'],
    [19,'GoodWe 10kW','Leapton 600W',16070,'','ESTIMADO'],
    [20,'GoodWe 10kW','Leapton 600W',16300,32690,'REAL'],
    [20,'GoodWe 10kW','Jinko 620W',17900,34490,'REAL'],
    [20,'FoxESS Micro','Leapton 600W',18000,34590,'REAL'],
    [20,'FoxESS Micro','Jinko 620W',19500,36290,'REAL'],
    [21,'GoodWe 10kW','Jinko 620W',18700,'','ESTIMADO'],
    [21,'GoodWe 10kW','Leapton 600W',17230,'','ESTIMADO'],
    [22,'GoodWe 12kW','Jinko 620W',19500,'','ESTIMADO'],
    [22,'GoodWe 12kW','Leapton 600W',17960,'','ESTIMADO'],
    [23,'GoodWe 12kW','Jinko 620W',20250,'','ESTIMADO'],
    [23,'GoodWe 12kW','Leapton 600W',18640,'','ESTIMADO'],
    [24,'FoxESS Micro','Jinko 620W',23000,'','ESTIMADO'],
    [24,'GoodWe 12kW','Jinko 620W',21000,'','ESTIMADO'],
    [24,'FoxESS Micro','Leapton 600W',21320,'','ESTIMADO'],
    [25,'GoodWe 12kW','Jinko 620W',21500,'','ESTIMADO'],
    [25,'GoodWe 12kW','Leapton 600W',19750,'','ESTIMADO'],
    [26,'GoodWe 12kW','Jinko 620W',22000,'','ESTIMADO'],
    [26,'GoodWe 12kW','Leapton 600W',20180,'','ESTIMADO'],
    [27,'GoodWe 12kW','Jinko 620W',22500,'','ESTIMADO'],
    [27,'GoodWe 12kW','Leapton 600W',20610,'','ESTIMADO'],
    [28,'GoodWe 15kW','Jinko 620W',25750,'','ESTIMADO'],
    [28,'GoodWe 15kW','Leapton 600W',23790,'','ESTIMADO'],
    [28,'FoxESS Micro','Jinko 620W',27300,'','ESTIMADO'],
    [28,'FoxESS Micro','Leapton 600W',25340,'','ESTIMADO'],
    [29,'GoodWe 15kW','Jinko 620W',26250,'','ESTIMADO'],
    [29,'GoodWe 15kW','Leapton 600W',24220,'','ESTIMADO'],
    [30,'GoodWe 15kW','Jinko 620W',26750,'','ESTIMADO'],
    [30,'GoodWe 15kW','Leapton 600W',24650,'','ESTIMADO'],
    [31,'GoodWe 15kW','Jinko 620W',27250,'','ESTIMADO'],
    [31,'GoodWe 15kW','Leapton 600W',25080,'','ESTIMADO'],
    [32,'GoodWe 15kW','Jinko 620W',27750,'','ESTIMADO'],
    [32,'GoodWe 15kW','Leapton 600W',25510,'','ESTIMADO'],
    [32,'FoxESS Micro','Jinko 620W',31200,'','ESTIMADO'],
    [32,'FoxESS Micro','Leapton 600W',28960,'','ESTIMADO'],
    [33,'GoodWe 15kW','Jinko 620W',28250,'','ESTIMADO'],
    [33,'GoodWe 15kW','Leapton 600W',25940,'','ESTIMADO'],
    [34,'GoodWe 20kW','Jinko 620W',33300,'','ESTIMADO'],
    [34,'GoodWe 20kW','Leapton 600W',30920,'','ESTIMADO'],
    [35,'GoodWe 20kW','Jinko 620W',33800,'','ESTIMADO'],
    [35,'GoodWe 20kW','Leapton 600W',31350,'','ESTIMADO'],
    [36,'GoodWe 20kW','Jinko 620W',34300,'','ESTIMADO'],
    [36,'GoodWe 20kW','Leapton 600W',31780,'','ESTIMADO'],
    [36,'FoxESS Micro','Jinko 620W',35100,'','ESTIMADO'],
    [36,'FoxESS Micro','Leapton 600W',32580,'','ESTIMADO'],
    [37,'GoodWe 20kW','Jinko 620W',34800,'','ESTIMADO'],
    [37,'GoodWe 20kW','Leapton 600W',32210,'','ESTIMADO'],
    [38,'GoodWe 20kW','Jinko 620W',35300,'','ESTIMADO'],
    [38,'GoodWe 20kW','Leapton 600W',32640,'','ESTIMADO'],
    [39,'GoodWe 20kW','Jinko 620W',35800,'','ESTIMADO'],
    [39,'GoodWe 20kW','Leapton 600W',33070,'','ESTIMADO'],
    [40,'GoodWe 20kW','Jinko 620W',36300,'','ESTIMADO'],
    [40,'GoodWe 20kW','Leapton 600W',33500,'','ESTIMADO'],
    [40,'FoxESS Micro','Jinko 620W',39000,'','ESTIMADO'],
    [40,'FoxESS Micro','Leapton 600W',36200,'','ESTIMADO'],
    [40,'GoodWe 20kW','Hanersun 610W',32016,'','REAL_COTAÇÃO'],
    [40,'FoxESS Micro','Hanersun 610W',34697,'','REAL_COTAÇÃO'],
    // ── Leapton 630W ──
    [6,'FoxESS Micro','Leapton 630W',6501,'','REAL'],
    [8,'FoxESS Micro','Leapton 630W',7760,'','ESTIMADO'],
    [12,'FoxESS Micro','Leapton 630W',11400,'','ESTIMADO'],
    [16,'FoxESS Micro','Leapton 630W',15200,'','ESTIMADO'],
    [20,'FoxESS Micro','Leapton 630W',19000,'','ESTIMADO'],
    // ── Leapton 600W (GoodWe string — real data) ──
    [12,'GoodWe 6kW','Leapton 600W',10690,'','REAL'],
    [13,'GoodWe 6kW','Leapton 600W',10898,'','REAL'],
    [16,'GoodWe 7.5kW','Leapton 600W',13892,'','REAL'],
    [20,'GoodWe 10kW','Leapton 600W',16300,'','REAL'],
    // ── DMEGC 625W ──
    [26,'FoxESS Micro (7x)','DMEGC 625W',24168,'','REAL'],
    [40,'FoxESS Micro (10x)','DMEGC 625W',38520,'','REAL'],
    [28,'FoxESS Micro','DMEGC 625W',25218,'','ESTIMADO'],
    [32,'FoxESS Micro','DMEGC 625W',28316,'','ESTIMADO'],
    [36,'FoxESS Micro','DMEGC 625W',32368,'','ESTIMADO'],
    // ── OSDA 710W ──
    [34,'GoodWe 12kW TRI (2x)','OSDA 710W',39820,'','REAL'],
    [28,'GoodWe 12kW TRI','OSDA 710W',31500,'','ESTIMADO'],
    [40,'GoodWe 20kW','OSDA 710W',47000,'','ESTIMADO'],
  ];
  og.getRange(1, 1, 1, ogHeaders.length).setValues([ogHeaders]);
  og.getRange(2, 1, ogData.length, ogHeaders.length).setValues(ogData);

  // ── ABA Hibrido ─────────────────────────────────────────────
  let hi = ss.getSheetByName('Hibrido') || ss.insertSheet('Hibrido');
  hi.clearContents();

  const hiHeaders = ['id','placas','inv','mod','bats','batMod','equip','status'];
  const hiData = [
    ['GW35-6J',6,'GoodWe 3.5kW Híbrido','Jinko 620W',1,'Lynx A (GoodWe)',13873,'ESTIMADO'],
    ['GW35-7J',7,'GoodWe 3.5kW Híbrido','Jinko 620W',1,'Lynx A (GoodWe)',14533,'ESTIMADO'],
    ['GW35-8J',8,'GoodWe 3.5kW Híbrido','Jinko 620W',1,'Lynx A (GoodWe)',15193,'REAL_COTAÇÃO'],
    ['GW35-8A',8,'GoodWe 3.5kW Híbrido','Astron 575W',1,'Lynx A (GoodWe)',14334,'REAL_COTAÇÃO'],
    ['GW5-7J',7,'GoodWe 5kW Híbrido','Jinko 620W',1,'Lynx A (GoodWe)',17252,'ESTIMADO'],
    ['GW5-8J',8,'GoodWe 5kW Híbrido','Jinko 620W',1,'Lynx A (GoodWe)',17912,'REAL_COTAÇÃO'],
    ['GW5-9J',9,'GoodWe 5kW Híbrido','Jinko 620W',1,'Lynx A (GoodWe)',18572,'ESTIMADO'],
    ['GW5-10J',10,'GoodWe 5kW Híbrido','Jinko 620W',1,'Lynx A (GoodWe)',19232,'ESTIMADO'],
    ['GW5-11J',11,'GoodWe 5kW Híbrido','Jinko 620W',1,'Lynx A (GoodWe)',19892,'ESTIMADO'],
    ['GW75-9J575-LX1',9,'GoodWe 7.5kW Híbrido','Jinko 575W',1,'Lynx A (GoodWe)',19900,'REAL_COTAÇÃO'],
    ['GW75-9J620-LX1',9,'GoodWe 7.5kW Híbrido','Jinko 620W',1,'Lynx A (GoodWe)',20353,'REAL_COTAÇÃO'],
    ['GW75-9L-1',9,'GoodWe 7.5kW Híbrido','Leapton 590W',1,'Unipower',18149,'REAL_COTAÇÃO'],
    ['GW75-9J-1',9,'GoodWe 7.5kW Híbrido','Jinko 620W',1,'Unipower',19049,'ESTIMADO'],
    ['GW75-10L-1',10,'GoodWe 7.5kW Híbrido','Leapton 590W',1,'Unipower',18709,'ESTIMADO'],
    ['GW75-10J-1',10,'GoodWe 7.5kW Híbrido','Jinko 620W',1,'Unipower',19709,'ESTIMADO'],
    ['GW75-11L-1',11,'GoodWe 7.5kW Híbrido','Leapton 590W',1,'Unipower',19269,'ESTIMADO'],
    ['GW75-11J-1',11,'GoodWe 7.5kW Híbrido','Jinko 620W',1,'Unipower',20369,'ESTIMADO'],
    ['GW75-12L-1',12,'GoodWe 7.5kW Híbrido','Leapton 590W',1,'Unipower',19829,'ESTIMADO'],
    ['GW75-12J-1',12,'GoodWe 7.5kW Híbrido','Jinko 620W',1,'Unipower',21029,'ESTIMADO'],
    ['GW75-13L-1',13,'GoodWe 7.5kW Híbrido','Leapton 590W',1,'Unipower',20389,'ESTIMADO'],
    ['GW75-13J-1',13,'GoodWe 7.5kW Híbrido','Jinko 620W',1,'Unipower',21689,'ESTIMADO'],
    ['GW75-14L-1',14,'GoodWe 7.5kW Híbrido','Leapton 590W',1,'Unipower',20949,'ESTIMADO'],
    ['GW75-14J-1',14,'GoodWe 7.5kW Híbrido','Jinko 620W',1,'Unipower',22349,'ESTIMADO'],
    ['GW75-15L-1',15,'GoodWe 7.5kW Híbrido','Leapton 590W',1,'Unipower',21509,'ESTIMADO'],
    ['GW75-15J-1',15,'GoodWe 7.5kW Híbrido','Jinko 620W',1,'Unipower',23009,'ESTIMADO'],
    ['GW75-16L-1',16,'GoodWe 7.5kW Híbrido','Leapton 590W',1,'Unipower',22069,'ESTIMADO'],
    ['GW75-16J-1',16,'GoodWe 7.5kW Híbrido','Jinko 620W',1,'Unipower',23669,'ESTIMADO'],
    ['GW75-9L-2',9,'GoodWe 7.5kW Híbrido','Leapton 590W',2,'Unipower',22457,'REAL_COTAÇÃO'],
    ['GW75-9J-2',9,'GoodWe 7.5kW Híbrido','Jinko 620W',2,'Unipower',23357,'ESTIMADO'],
    ['GW75-16L-2',16,'GoodWe 7.5kW Híbrido','Leapton 590W',2,'Unipower',26377,'ESTIMADO'],
    ['GW75-16J-2',16,'GoodWe 7.5kW Híbrido','Jinko 620W',2,'Unipower',27977,'ESTIMADO'],
    ['GW75-9L-3',9,'GoodWe 7.5kW Híbrido','Leapton 590W',3,'Unipower',26765,'REAL_COTAÇÃO'],
    ['GW75-9J-3',9,'GoodWe 7.5kW Híbrido','Jinko 620W',3,'Unipower',27665,'ESTIMADO'],
    // ── DMEGC 625W (GoodWe Híbrido — dados reais Out/2026) ──
    ['GW75-12D-0',12,'GoodWe 7.5kW Híbrido','DMEGC 625W',0,'Sem bateria',16932,'REAL'],
    ['GW10-18D-1',18,'GoodWe 10kW Híbrido','DMEGC 625W',1,'Lynx 5kWh (GoodWe)',31788,'REAL'],
    ['GW75-16D-0',16,'GoodWe 7.5kW Híbrido','DMEGC 625W',0,'Sem bateria',20000,'ESTIMADO'],
    ['GW10-12D-0',12,'GoodWe 10kW Híbrido','DMEGC 625W',0,'Sem bateria',20500,'ESTIMADO'],
    ['GW10-16D-1',16,'GoodWe 10kW Híbrido','DMEGC 625W',1,'Lynx 5kWh (GoodWe)',28000,'ESTIMADO'],
    // ── Sofar 7.5kW Híbrido — NÃO PRIORIZAR (equip +R$2k sobre cotação anterior) ──
    ['SF75-9L-1',9,'Sofar 7.5kW Híbrido','Leapton 590W',1,'Unipower',19579,'ESTIMADO'],
    ['SF75-9J-1',9,'Sofar 7.5kW Híbrido','Jinko 620W',1,'Unipower',20479,'ESTIMADO'],
    ['SF75-10L-1',10,'Sofar 7.5kW Híbrido','Leapton 590W',1,'Unipower',20139,'ESTIMADO'],
    ['SF75-10J-1',10,'Sofar 7.5kW Híbrido','Jinko 620W',1,'Unipower',21139,'ESTIMADO'],
    ['SF75-12L-1',12,'Sofar 7.5kW Híbrido','Leapton 590W',1,'Unipower',21259,'ESTIMADO'],
    ['SF75-12J-1',12,'Sofar 7.5kW Híbrido','Jinko 620W',1,'Unipower',22459,'ESTIMADO'],
    ['SF75-16L-1',16,'Sofar 7.5kW Híbrido','Leapton 590W',1,'Unipower',23499,'ESTIMADO'],
    ['SF75-16J-1',16,'Sofar 7.5kW Híbrido','Jinko 620W',1,'Unipower',25099,'ESTIMADO'],
    ['SF75-9L-2',9,'Sofar 7.5kW Híbrido','Leapton 590W',2,'Unipower',23874,'ESTIMADO'],
    ['SF75-9J-2',9,'Sofar 7.5kW Híbrido','Jinko 620W',2,'Unipower',24774,'ESTIMADO'],
    ['SF75-16L-2',16,'Sofar 7.5kW Híbrido','Leapton 590W',2,'Unipower',27794,'ESTIMADO'],
    ['SF75-16J-2',16,'Sofar 7.5kW Híbrido','Jinko 620W',2,'Unipower',29394,'ESTIMADO'],
  ];
  hi.getRange(1, 1, 1, hiHeaders.length).setValues([hiHeaders]);
  hi.getRange(2, 1, hiData.length, hiHeaders.length).setValues(hiData);

  // ── Compartilhar como "Qualquer pessoa com o link pode ver" ──
  const file = DriveApp.getFileById(ss.getId());
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  SpreadsheetApp.getUi().alert('✅ Concluído! Abas OnGrid e Hibrido populadas e planilha compartilhada publicamente.');
}
