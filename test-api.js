import https from "https";

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "chat-app-6o66.onrender.com",
      port: 443,
      path: `/api${path}`,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function test() {
  const email = `testuser${Date.now()}@example.com`;
  const password = "Password123@";

  console.log("=== Testing Signup ===");
  try {
    const res = await makeRequest("POST", "/auth/signup", {
      email,
      fullName: "Test User",
      password,
    });
    console.log(`✅ Signup: ${res.status}`, res.data);
  } catch (e) {
    console.log("❌ Signup Error:", e.message);
  }

  console.log("\n=== Testing Login (With the account we just created) ===");
  try {
    const res = await makeRequest("POST", "/auth/login", {
      email,
      password,
    });
    console.log(`✅ Login: ${res.status}`, res.data?.message || res.data);
  } catch (e) {
    console.log("❌ Login Error:", e.message);
  }

  console.log("\n=== Testing Check Auth ===");
  try {
    const res = await makeRequest("GET", "/auth/check");
    console.log(`Auth Check: ${res.status}`, res.data);
  } catch (e) {
    console.log("Auth Check Error:", e.message);
  }
}

test();
