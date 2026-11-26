package cz.curatas.auth;

import org.junit.jupiter.api.Test;
import java.nio.file.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class Update4UiBrowserPostgres17Test {
    @Test void visibleCreationSectionSavesReloadAndConcurrentChromeSessions() throws Exception {
        var h = ProfessionalRegistryPostgres17Test.harness();
        try {
            h.start(); h.fixture();
            for (String capability : List.of("item.create", "item.professional.write", "item.inventory.write", "dictionary.read", "dictionary.write"))
                h.db.update("INSERT INTO core.catalog_grant(user_id,institution_id,catalog_id,capability) VALUES(1,1,1,?) ON CONFLICT DO NOTHING", capability);
            h.db.execute("SELECT setval('core.item_id_seq',(SELECT max(id) FROM core.item),true)");
   // Traceable, whitelisted real source excerpt; local ID deliberately differs from UAT 1001.
   var samples=h.json.readTree(Path.of("src/test/resources/update2/museum-samples.json").toFile());var sample=samples.path("items").get(0);var typed=h.json.createObjectNode();sample.path("native").fields().forEachRemaining(e->{var v=typed.putObject(e.getKey());v.put("kind",e.getValue().isNumber()?"INTEGER":e.getValue().isBoolean()?"BOOLEAN":e.getValue().isNull()?"NULL":"TEXT");if(!e.getValue().isNull())v.set("value",e.getValue());});
   h.db.update("INSERT INTO core.item(id,title,inventory_number,is_active,published,created_at,updated_at) VALUES(9001,NULL,?,true,false,now(),now())",sample.path("inventory_number").asText());
   h.db.execute("INSERT INTO core.item_catalog_ownership(item_id,catalog_id,assigned_by,decision_id,evidence_sha256,rule_version) VALUES(9001,1,1,gen_random_uuid(),repeat('e',64),'SAFE_EXCERPT_TEST');INSERT INTO migration_stage.source_artifact(artifact_id,byte_length,status) VALUES(repeat('4',64),0,'COMPLETE');INSERT INTO migration_stage.source_table(artifact_id,table_name,schema_metadata,linked,status) VALUES(repeat('4',64),'Sbirky','{}',false,'COMPLETE')");
   h.db.update("INSERT INTO migration_stage.raw_record(record_id,artifact_id,table_name,row_hash,occurrence,typed_values) VALUES(?,repeat('4',64),'Sbirky',repeat('6',64),1,?::jsonb)",sample.path("sourceRecord").asText(),typed.toString());
   h.db.update("INSERT INTO migration_stage.projection_decision(id,record_id,target_table,action,proposed_values,approved_by,reason,rule_version) VALUES(repeat('6',64),?,'item','INSERT','{}','SAFE_EXCERPT_TEST','SAFE_EXCERPT_TEST','SAFE_EXCERPT_TEST')",sample.path("sourceRecord").asText());
   h.db.update("INSERT INTO migration_stage.projection_lineage(record_id,target_table,target_id,decision_id,target_hash) VALUES(?,'item',9001,repeat('6',64),repeat('7',64))",sample.path("sourceRecord").asText());

            String raw = Citem13MeetingBrowserPostgres17Test.fingerprint(h);
            Path out = h.evidence.resolve("update4-ui"); Files.createDirectories(out);
            Path input = out.resolve("private-input.json");
            var arguments=new LinkedHashMap<String,Object>(); for(String type:List.of("FUND","AUTHOR","OBJECT_TYPE")){String id=UUID.randomUUID().toString(); V70MatTechPositionBrowserPostgres17Test.seed(h,id,type,"GENERATED "+type,null);arguments.put(type+"1",id);} arguments.putAll(Map.of("backend", h.base, "frontendRoot", Path.of("../fe/dist").toAbsolutePath().normalize().toString(), "password", LocalAuthenticationPostgres17Test.PASSWORD, "output", out.toString())); h.json.writeValue(input.toFile(),arguments);
            Process runner = new ProcessBuilder("C:/Program Files/nodejs/node.exe", "scripts/test-update4-ui-browser.mjs", input.toString()).directory(Path.of("../fe").toFile()).redirectErrorStream(true).redirectOutput(out.resolve("runner.log").toFile()).start();
            try {
                assertTrue(runner.waitFor(170, java.util.concurrent.TimeUnit.SECONDS), out.toString());
                assertEquals(0, runner.exitValue(), out.toString());
            } finally { if(runner.isAlive()) { runner.destroy(); runner.waitFor(5, java.util.concurrent.TimeUnit.SECONDS); } }
            var result = h.json.readTree(out.resolve("save-browser-result.json").toFile());
            assertEquals("PASS", result.path("status").asText()); assertEquals(2, result.path("items").size());
            for (var item : result.path("items")) {
                long id = item.path("id").asLong();
                assertEquals(1, h.db.queryForObject("SELECT count(*) FROM core.item WHERE id=?", Integer.class, id));
            }
            assertEquals(raw, Citem13MeetingBrowserPostgres17Test.fingerprint(h));
            h.json.writeValue(out.resolve("sql-proof.json").toFile(), Map.of("status", "PASS", "result", "ITEM_CREATE_SAVE_P0_PASS", "rawLineageUnchanged", true, "actualChrome", true));
            System.out.println("STABILIZATION_SAVE_EVIDENCE=" + out);
        } finally { h.close(); }
    }
}
