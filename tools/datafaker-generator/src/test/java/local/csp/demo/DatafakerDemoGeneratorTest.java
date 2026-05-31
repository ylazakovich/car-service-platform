package local.csp.demo;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DatafakerDemoGeneratorTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void demoProfileGeneratesAdminStaffAndEveryRepairStatus() throws Exception {
        Map<String, Object> payload = generate("--seed", "123", "--locale", "en-US", "--count", "5", "--profile", "demo");

        List<Map<String, Object>> users = rows(payload, "users");
        assertTrue(users.stream().anyMatch(user -> user.get("email").equals("admin@autoservice.local") && user.get("role").equals("admin")));
        assertTrue(users.stream().anyMatch(user -> user.get("email").equals("staff@autoservice.local") && user.get("role").equals("staff")));

        Set<String> statuses = rows(payload, "repairs").stream()
                .map(row -> String.valueOf(row.get("status")))
                .collect(Collectors.toSet());
        assertEquals(Set.of("new", "in_progress", "waiting_parts", "completed", "picked_up"), statuses);
    }

    @Test
    void demoProfileBuildsRicherRelationshipsThanOneToOneFixture() throws Exception {
        Map<String, Object> payload = generate("--seed", "123", "--locale", "en-US", "--count", "6", "--profile", "demo");

        List<Map<String, Object>> customers = rows(payload, "customers");
        List<Map<String, Object>> vehicles = rows(payload, "vehicles");
        List<Map<String, Object>> repairs = rows(payload, "repairs");
        List<Map<String, Object>> purchases = rows(payload, "purchases");

        assertEquals(6, customers.size());
        assertTrue(vehicles.size() > customers.size(), "demo profile should include customers with multiple vehicles");
        assertTrue(repairs.size() > vehicles.size(), "demo profile should include vehicles with repair history");
        assertTrue(purchases.size() > repairs.size(), "demo profile should include multiple parts on some repairs");
        assertTrue(repairs.stream().anyMatch(row -> ((List<?>) row.get("service_line_keys")).size() > 1));
    }

    @Test
    void profilePresetControlsDefaultCountWhenCountIsOmitted() throws Exception {
        Map<String, Object> payload = generate("--seed", "123", "--profile", "showcase");

        Map<String, Object> metadata = row(payload, "metadata");
        assertEquals(40, ((Number) metadata.get("count")).intValue());
        assertEquals(40, rows(payload, "customers").size());
    }

    private static Map<String, Object> generate(String... args) throws Exception {
        Path output = Files.createTempFile("datafaker-demo", ".json");
        String[] fullArgs = new String[args.length + 4];
        fullArgs[0] = "generate";
        fullArgs[1] = "datafaker-demo";
        System.arraycopy(args, 0, fullArgs, 2, args.length);
        fullArgs[fullArgs.length - 1] = output.toString();
        fullArgs[fullArgs.length - 2] = "--output";
        DatafakerDemoGenerator.main(fullArgs);
        return MAPPER.readValue(output.toFile(), new TypeReference<>() {});
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> rows(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        assertTrue(value instanceof List, key + " should be a list");
        return (List<Map<String, Object>>) value;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> row(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        assertTrue(value instanceof Map, key + " should be an object");
        return (Map<String, Object>) value;
    }
}
