package cz.curatas.auth;
import org.junit.jupiter.api.Test;import org.flywaydb.core.Flyway;
import java.nio.file.*;import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
/** Reported UUID/record IDs on an owned V70 fixture; original API, no mocks. */
class Update4MatTechBrowserPostgres17Test {
 @Test void existingUuidRowsPopulateOriginalSelectorsSaveAndReloadWithMoreThanThreeRows()throws Exception {
  var output=Path.of("../evidence/v70-mattech-ui/native-"+UUID.randomUUID()).toAbsolutePath();Files.createDirectories(output);
  var h=new GapClosureHarness(){
   @Override void provisionAdditionalRuntime()throws Exception {super.provisionAdditionalRuntime();Flyway.configure().dataSource(owner).schemas("core","app_config").defaultSchema("core").locations("classpath:db/migration").target("70").load().migrate();
    db.execute("GRANT EXECUTE ON FUNCTION core.catalog_historical_accessions(bigint),core.catalog_media_is_archived(bigint,bigint,uuid),core.archive_catalog_attachment(bigint,bigint,uuid,bigint,bigint),core.catalog_historical_vocabulary_v1(bigint,text,text,text,integer),core.catalog_historical_authority_ref(bigint,text,text) TO curatas_local_runtime;GRANT SELECT(item_id,accession_number,deleted_at) ON core.item_acquisition TO curatas_local_runtime");}
   @Override String[] adjustArguments(String[] initial){var a=new ArrayList<>(List.of(super.adjustArguments(initial)));a.addAll(List.of("--app.catalog.items.historical-accessions.enabled=true","--app.catalog.items.media-archive-enabled=true","--app.catalog.dictionaries.historical-enabled=true","--app.catalog.dictionaries.historical-assignments-enabled=true","--app.catalog.dictionaries.historical-mattech-multiple-enabled=true"));return a.toArray(String[]::new);}
  };
  try {
   h.start();h.fixture(); // Bounded generated contract fixture; no archival replay.
   h.db.execute("UPDATE core.catalog SET code='POLAKOVA' WHERE id=1;INSERT INTO core.catalog_grant(user_id,institution_id,catalog_id,capability) VALUES(1,1,1,'item.professional.write'),(1,1,1,'dictionary.write') ON CONFLICT DO NOTHING");
   String material="fa02a5e4-0e5c-5bb0-a863-f32850e8482f",technique="243f8ea6-482b-5f27-89aa-b2e20cdfb7a8";
   seed(h,material,"MATERIAL","vejce slepičí vyfouknuté",null);seed(h,technique,"TECHNIQUE","batikování voskem reliéfní",null);
   assertEquals(0,h.db.queryForObject("SELECT count(*) FROM core.item_museum_record",Integer.class));h.db.execute("SELECT setval('core.item_museum_record_id_seq',5,true)");
   assertEquals(6,child(h,1001,"materialAuthorityId",material));assertEquals(7,child(h,1001,"techniqueAuthorityId",technique));
   var trees=new LinkedHashMap<String,List<String>>();
   for(String type:List.of("MATERIAL","TECHNIQUE")){var ids=new ArrayList<String>();String parent=null;for(int i=0;i<3;i++){String id=UUID.randomUUID().toString();seed(h,id,type,"GENERATED explicit current "+type+" level "+(i+1),parent);ids.add(id);parent=id;}trees.put(type.equals("MATERIAL")?"Materiál":"Technika",ids);}
   h.db.execute("INSERT INTO core.item(id,title,inventory_number,is_active,published,created_at,updated_at) VALUES(1002,'GENERATED five independent rows','GENERATED-V70-MANY',true,false,now(),now());INSERT INTO core.item_catalog_ownership(item_id,catalog_id,assigned_by,decision_id,evidence_sha256,rule_version) VALUES(1002,1,1,gen_random_uuid(),repeat('e',64),'GENERATED_V70_UI_ONLY')");
   var many=new ArrayList<Map<String,Object>>();for(String label:List.of("kov","sklo","dřevo","textil","keramika")){String id=UUID.randomUUID().toString();seed(h,id,"MATERIAL",label,null);many.add(Map.of("record",child(h,1002,"materialAuthorityId",id),"uuid",id));}
   String before=PolakovaVocabularyFixture.fingerprint(h);String token=h.token("gen-root");
   var api=h.call("GET","/api/v2/catalogs/1/items/1001/professional-records",token,null,null,false);assertEquals(200,api.code(),api.raw().body());
   for(var r:api.body().path("items")){String key=r.path("id").asLong()==6?"materialAuthorityId":"techniqueAuthorityId";assertEquals(key.startsWith("material")?material:technique,r.path("payload").path(key).asText());assertFalse(r.path("authorityLabels").path(key).asText().isBlank());}
   var input=output.resolve("private-input.json");h.json.writeValue(input.toFile(),Map.of("dataKind","REPORTED_V70_UUID_LOCAL_CONTRACT_FIXTURE","material",material,"technique",technique,"many",many,"trees",trees,"backend",h.base,"password",LocalAuthenticationPostgres17Test.PASSWORD,"output",output.toString(),"frontendRoot",Path.of("../fe/dist").toAbsolutePath().normalize().toString()));
   var p=new ProcessBuilder("C:/Program Files/nodejs/node.exe","scripts/test-update4-mattech-browser.mjs",input.toString()).directory(Path.of("../fe").toFile()).redirectErrorStream(true).redirectOutput(output.resolve("runner.log").toFile()).start();
   try{assertTrue(p.waitFor(150,java.util.concurrent.TimeUnit.SECONDS),"Browser timeout "+output);assertEquals(0,p.exitValue(),output.toString());}finally{if(p.isAlive()){p.destroy();p.waitFor(5,java.util.concurrent.TimeUnit.SECONDS);}}
   assertEquals(before,PolakovaVocabularyFixture.fingerprint(h));
   assertEquals(material,h.db.queryForObject("SELECT payload->>'materialAuthorityId' FROM core.item_museum_record WHERE id=6",String.class));assertEquals(technique,h.db.queryForObject("SELECT payload->>'techniqueAuthorityId' FROM core.item_museum_record WHERE id=7",String.class));
   assertEquals(6,h.db.queryForObject("SELECT count(*) FROM core.item_museum_record WHERE item_id=1002 AND kind='MATERIAL_TECHNIQUE' AND deleted_at IS NULL",Integer.class));
   assertEquals(70,h.db.queryForObject("SELECT max(version::int) FROM core.flyway_schema_history",Integer.class));
   String audit=Files.readString(Path.of("ops/v70-mattech-ui/verify-data.sql"));
   String query=audit.substring(audit.indexOf("WITH RECURSIVE"),audit.indexOf("COMMIT;"));
   var auditResult=h.json.readTree(h.db.queryForObject(query,String.class));
   assertEquals(0,auditResult.path("invalidPaths").asInt());
   assertEquals(2,auditResult.path("reportedItem1001").size());
   h.json.writeValue(output.resolve("native-result.json").toFile(),Map.of("status","PASS","schema",70,"reportedCase1001",true,"materialRecord6",material,"techniqueRecord7",technique,"rawLineageUnchanged",true,"noBackendApplicationChanges",true,"liveUatVerified",false,"readOnlyAuditProjectionExecuted",true));
  }finally{h.close();}
 }
 static void seed(GapClosureHarness h,String id,String type,String label,String parent){h.db.update("INSERT INTO core.catalog_dictionary_value(id,catalog_id,dict_type,label,parent_id,created_by,updated_by) VALUES(?::uuid,1,?,?,?::uuid,1,1)",id,type,label,parent);}
 static long child(GapClosureHarness h,long item,String key,String id)throws Exception {String payload=h.json.writeValueAsString(Map.of(key,id,"Pozn_MT","GENERATED owned fixture using reported UUID contract; not UAT import evidence"));return h.db.queryForObject("SELECT core.save_catalog_current_professional(1,?,NULL,'MATERIAL_TECHNIQUE',?::jsonb,1,(SELECT row_version FROM core.item WHERE id=?))",Long.class,item,payload,item);}
}
