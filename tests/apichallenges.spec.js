import { test, expect } from "@playwright/test";

test.describe("API @challenge", () => {
  const URL = "https://apichallenges.herokuapp.com/";
  let token;
  let authToken; // Для хранения X-AUTH-TOKEN из теста 49

  // 01 - Получаем токен перед всеми тестами POST /challenger (201)
  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${URL}challenger`);
    const headers = await response.headers();
    token = headers["x-challenger"];
    console.log("Получили такой токен: " + token);
    expect(headers).toEqual(expect.objectContaining({ "x-challenger": expect.any(String) }));
  });

  // 02 - Получаем список заданий GET /challenges (200)
  test("02 challenge: GET /challenges", async ({ request }) => {
    const response = await request.get(`${URL}challenges`, {
      headers: { "x-challenger": token },
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.challenges.length).toBe(59);
  });

  // 03 - Получить список всех задач GET /todos (200)
  test("03 challenge: GET /todos", async ({ request }) => {
    const response = await request.get(`${URL}todos`, {
      headers: { "x-challenger": token },
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(Array.isArray(body.todos)).toBeTruthy();
  });

  // 04 - Проверка, что запрос к /todo возвращает 404 GET /todo (404)
  test("04 challenge: GET /todo (404)", async ({ request }) => {
    const response = await request.get(`${URL}todo`, {
      headers: { "x-challenger": token },
    });
    expect(response.status()).toBe(404);
  });

  // 05 - Получить конкретную задачу по ID GET /todos/{id} (200)
  test("05 challenge: GET /todos/{id} (200)", async ({ request }) => {
    const createResponse = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Task for ID", doneStatus: false },
    });
    const createdTask = await createResponse.json();
    const taskId = createdTask.id;

    const response = await request.get(`${URL}todos/${taskId}`, {
      headers: { "x-challenger": token },
    });
    expect(response.status()).toBe(200);
  });

  // 06 - Запрос к несуществующей задаче GET /todos/{id} (404)
  test("06 challenge: GET /todos/{id} (404)", async ({ request }) => {
    const response = await request.get(`${URL}todos/999999`, {
      headers: { "x-challenger": token },
    });
    expect(response.status()).toBe(404);
  });

  // 07 - GET /todos (200) с фильтром по doneStatus
  test("07 challenge: GET /todos ?filter", async ({ request }) => {
    await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Done Task", doneStatus: true },
    });
    await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Not Done Task", doneStatus: false },
    });

    const doneResponse = await request.get(`${URL}todos?doneStatus=true`, {
      headers: { "x-challenger": token },
    });
    const doneBody = await doneResponse.json();
    expect(doneResponse.status()).toBe(200);
    expect(doneBody.todos.every((todo) => todo.doneStatus === true)).toBeTruthy();

    const notDoneResponse = await request.get(`${URL}todos?doneStatus=false`, {
      headers: { "x-challenger": token },
    });
    const notDoneBody = await notDoneResponse.json();
    expect(notDoneResponse.status()).toBe(200);
    expect(notDoneBody.todos.every((todo) => todo.doneStatus === false)).toBeTruthy();
  });

  // 08 - HEAD /todos (200)
  test("08 challenge: HEAD /todos (200)", async ({ request }) => {
    const response = await request.head(`${URL}todos`, {
      headers: { "x-challenger": token },
    });
    expect(response.status()).toBe(200);
    expect((await response.body()).toString()).toBe("");
  });

  // 09 - POST /todos (201)
  test("09 challenge: POST /todos (201)", async ({ request }) => {
    const response = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "New Task", doneStatus: false },
    });
    const body = await response.json();
    expect(response.status()).toBe(201);
    expect(body).toHaveProperty("id");
    expect(body.title).toBe("New Task");
  });

  // 10 - POST /todos (400) - Невалидный doneStatus
  test("10 challenge: POST /todos (400) doneStatus", async ({ request }) => {
    const response = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Invalid doneStatus", doneStatus: "invalid" },
    });
    const body = await response.json();
    expect(response.status()).toBe(400);
    expect(body.errorMessages).toContainEqual(expect.stringContaining("doneStatus"));
  });

  // 11 - POST /todos (400) - Заголовок слишком длинный
  test("11 challenge: POST /todos (400) - Long title", async ({ request }) => {
    const response = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "a".repeat(1000), doneStatus: false },
    });
    const body = await response.json();
    expect(response.status()).toBe(400);
    expect(body.errorMessages).toContainEqual(expect.stringContaining("title"));
  });

  // 12 - POST /todos (400) - Описание слишком длинное
  test("12 challenge: POST /todos (400) - Long description", async ({ request }) => {
    const response = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Task", description: "a".repeat(300), doneStatus: false },
    });
    const body = await response.json();
    expect(response.status()).toBe(400);
    expect(body.errorMessages).toContainEqual(expect.stringContaining("description"));
  });

  // 13 - POST /todos (201) - Максимальная длина title и description
  test("13 challenge: POST /todos (201) - Max length", async ({ request }) => {
    const response = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "a".repeat(50), description: "b".repeat(200), doneStatus: false },
    });
    const body = await response.json();
    expect(response.status()).toBe(201);
    expect(body.title).toBe("a".repeat(50));
  });

  // 14 - POST /todos (413) - Превышен максимальный размер payload
  test("14 challenge: POST /todos (413)", async ({ request }) => {
    const response = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Task", description: "a".repeat(5000), doneStatus: false },
    });
    expect(response.status()).toBe(413);
  });

  // 15 - POST /todos (400) - Лишнее поле в payload
  test("15 challenge: POST /todos (400) - Extra field", async ({ request }) => {
    const response = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Task", doneStatus: false, priority: "high" },
    });
    const body = await response.json();
    expect(response.status()).toBe(400);
    expect(body.errorMessages).toContain("Could not find field: priority");
  });

  // 16 - PUT /todos/{id} (400) - Несуществующий ID
  test("16 challenge: PUT /todos/{id} (400)", async ({ request }) => {
    const response = await request.put(`${URL}todos/999999`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Task", doneStatus: false, description: "Test" },
    });
    expect(response.status()).toBe(400);
  });

  // 17 - POST /todos/{id} (200) - Успешное обновление
  test("17 challenge: POST /todos/{id} (200)", async ({ request }) => {
    const createResponse = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Initial", doneStatus: false },
    });
    const createdTask = await createResponse.json();
    const taskId = createdTask.id;

    const response = await request.post(`${URL}todos/${taskId}`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Updated", doneStatus: true },
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.title).toBe("Updated");
    expect(body.doneStatus).toBe(true);
  });

  // 18 - POST /todos/{id} (404) - Несуществующий ID
  test("18 challenge: POST /todos/{id} (404)", async ({ request }) => {
    const response = await request.post(`${URL}todos/999999`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Task", doneStatus: true },
    });
    expect(response.status()).toBe(404);
  });

  // 19 - PUT /todos/{id} full (200)
  test("19 challenge: PUT /todos/{id} full (200)", async ({ request }) => {
    const createResponse = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Initial", doneStatus: false },
    });
    const createdTask = await createResponse.json();
    const taskId = createdTask.id;

    const response = await request.put(`${URL}todos/${taskId}`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Updated", description: "New desc", doneStatus: true },
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.title).toBe("Updated");
  });

  // 20 - PUT /todos/{id} partial (200)
  test("20 challenge: PUT /todos/{id} partial (200)", async ({ request }) => {
    const createResponse = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Initial", doneStatus: false },
    });
    const createdTask = await createResponse.json();
    const taskId = createdTask.id;

    const response = await request.put(`${URL}todos/${taskId}`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Updated" },
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.title).toBe("Updated");
  });

  // 21 - PUT /todos/{id} no title (400)
  test("21 challenge: PUT /todos/{id} no title (400)", async ({ request }) => {
    const createResponse = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Initial", doneStatus: false },
    });
    const createdTask = await createResponse.json();
    const taskId = createdTask.id;

    const response = await request.put(`${URL}todos/${taskId}`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { doneStatus: true },
    });
    expect(response.status()).toBe(400);
  });

  // 22 - PUT /todos/{id} different id (400)
  test("22 challenge: PUT /todos/{id} different id (400)", async ({ request }) => {
    const createResponse = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Initial", doneStatus: false },
    });
    const createdTask = await createResponse.json();
    const taskId = createdTask.id;

    const response = await request.put(`${URL}todos/${taskId}`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { id: taskId + 1, title: "Updated", doneStatus: true },
    });
    expect(response.status()).toBe(400);
  });

  // 23 - DELETE /todos/{id} (200)
  test("23 challenge: DELETE /todos/{id} (200)", async ({ request }) => {
    // Очищаем все задачи
    const todosResponse = await request.get(`${URL}todos`, {
      headers: { "x-challenger": token },
    });
    const todos = (await todosResponse.json()).todos || [];
    for (const todo of todos) {
      await request.delete(`${URL}todos/${todo.id}`, {
        headers: { "x-challenger": token },
      });
    }
  
    // Создаём новую задачу
    const createResponse = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Task for deletion", doneStatus: false },
    });
    expect(createResponse.status()).toBe(201);
    const createdTask = await createResponse.json();
    const taskId = createdTask.id;
    expect(taskId).toBeDefined();
  
    // Удаляем задачу
    const deleteResponse = await request.delete(`${URL}todos/${taskId}`, {
      headers: { "x-challenger": token },
    });
    expect(deleteResponse.status()).toBe(200);
  
    // Проверяем, что задача удалена
    const checkResponse = await request.get(`${URL}todos/${taskId}`, {
      headers: { "x-challenger": token },
    });
    expect(checkResponse.status()).toBe(404);
  });

  // 24 - OPTIONS /todos (200)
  test("24 challenge: OPTIONS /todos (200)", async ({ request }) => {
    const response = await request.fetch(`${URL}todos`, {
      method: "OPTIONS",
      headers: { "x-challenger": token },
    });
    expect(response.status()).toBe(200);
    expect((await response.headers())["allow"]).toBeDefined();
  });

  // 25 - GET /todos (200) XML
  test("25 challenge: GET /todos XML (200)", async ({ request }) => {
    const response = await request.get(`${URL}todos`, {
      headers: { "x-challenger": token, "Accept": "application/xml" },
    });
    const body = await response.text();
    expect(response.status()).toBe(200);
    expect((await response.headers())["content-type"]).toContain("application/xml");
    expect(body).toMatch(/<todos>/);
  });

  // 26 - GET /todos (200) JSON
  test("26 challenge: GET /todos JSON (200)", async ({ request }) => {
    const response = await request.get(`${URL}todos`, {
      headers: { "x-challenger": token, "Accept": "application/json" },
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect((await response.headers())["content-type"]).toContain("application/json");
    expect(body).toHaveProperty("todos");
  });

  // 27 - GET /todos (200) ANY
  test("27 challenge: GET /todos ANY (200)", async ({ request }) => {
    const response = await request.get(`${URL}todos`, {
      headers: { "x-challenger": token, "Accept": "*/*" },
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect((await response.headers())["content-type"]).toContain("application/json");
    expect(body).toHaveProperty("todos");
  });

  // 28 - GET /todos (200) XML+JSON
  test("28 challenge: GET /todos XML+JSON (200)", async ({ request }) => {
    const response = await request.get(`${URL}todos`, {
      headers: { "x-challenger": token, "Accept": "application/xml, application/json" },
    });
    const body = await response.text();
    expect(response.status()).toBe(200);
    expect((await response.headers())["content-type"]).toContain("application/xml");
    expect(body).toMatch(/<todos>/);
  });

  // 29 - GET /todos (200) no Accept
  test("29 challenge: GET /todos no Accept (200)", async ({ request }) => {
    const response = await request.get(`${URL}todos`, {
      headers: { "x-challenger": token },
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect((await response.headers())["content-type"]).toContain("application/json");
    expect(body).toHaveProperty("todos");
  });

  // 30 - GET /todos (406)
  test("30 challenge: GET /todos (406)", async ({ request }) => {
    const response = await request.get(`${URL}todos`, {
      headers: { "x-challenger": token, "Accept": "application/gzip" },
    });
    expect(response.status()).toBe(406);
  });

  // 31 - POST /todos XML (201)
  test("31 challenge: POST /todos XML (201)", async ({ request }) => {
    const xmlPayload = `<todo><title>XML Task</title><doneStatus>false</doneStatus><description>Test</description></todo>`;
    const response = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/xml", "Accept": "application/xml" },
      data: xmlPayload,
    });
    const body = await response.text();
    expect(response.status()).toBe(201);
    expect((await response.headers())["content-type"]).toContain("application/xml");
    expect(body).toMatch(/<title>XML Task<\/title>/);
  });

  // 32 - POST /todos JSON (201)
  test("32 challenge: POST /todos JSON (201)", async ({ request }) => {
    const response = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json", "Accept": "application/json" },
      data: { title: "JSON Task" },
    });
    const body = await response.json();
    expect(response.status()).toBe(201);
    expect((await response.headers())["content-type"]).toContain("application/json");
    expect(body.title).toBe("JSON Task");
  });

  // 33 - POST /todos (415)
  test("33 challenge: POST /todos (415)", async ({ request }) => {
    const response = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "bob" },
      data: { title: "Task", doneStatus: false },
    });
    expect(response.status()).toBe(415);
  });

  // 34 - GET /challenger/{guid} (200)
  test("34 challenge: GET /challenger/{guid} (200)", async ({ request }) => {
    const response = await request.get(`${URL}challenger/${token}`, {
      headers: { "x-challenger": token },
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body).toHaveProperty("challengeStatus");
    expect(body.xChallenger).toEqual(token);
  });

  // 35 - PUT /challenger/{guid} RESTORE (200)
  test("35 challenge: PUT /challenger/{guid} RESTORE (200)", async ({ request }) => {
    const getResponse = await request.get(`${URL}challenger/${token}`, {
      headers: { "x-challenger": token },
    });
    const progressData = await getResponse.json();

    const response = await request.put(`${URL}challenger/${token}`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: progressData,
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.xChallenger).toEqual(token);
  });

  // 36 - PUT /challenger/{guid} CREATE (200)
  test("36 challenge: PUT /challenger/{guid} CREATE (200)", async ({ request }) => {
    const newChallengerResponse = await request.post(`${URL}challenger`);
    const oldGuid = newChallengerResponse.headers()["x-challenger"];

    const getResponse = await request.get(`${URL}challenger/${oldGuid}`, {
      headers: { "x-challenger": oldGuid },
    });
    const progressData = await getResponse.json();

    const response = await request.put(`${URL}challenger/${oldGuid}`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: progressData,
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.xChallenger).toEqual(oldGuid);
  });

  // 37 - GET /challenger/database/{guid} (200)
  test("37 challenge: GET /challenger/database/{guid} (200)", async ({ request }) => {
    const response = await request.get(`${URL}challenger/database/${token}`, {
      headers: { "x-challenger": token },
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body).toHaveProperty("todos");
  });

  // 38 - PUT /challenger/database/{guid} (204)
  test("38 challenge: PUT /challenger/database/{guid} (204)", async ({ request }) => {
    const todosPayload = {
      todos: [
        { id: 1, title: "Task 1", doneStatus: false, description: "Desc 1" },
        { id: 2, title: "Task 2", doneStatus: true, description: "Desc 2" },
      ],
    };
    const response = await request.put(`${URL}challenger/database/${token}`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: todosPayload,
    });
    expect(response.status()).toBe(204);
  });

  // 39 - POST /todos XML to JSON (201)
  test("39 challenge: POST /todos XML to JSON (201)", async ({ request }) => {
    const xmlPayload = `<todo><title>XML to JSON</title><doneStatus>false</doneStatus><description>Test</description></todo>`;
    const response = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/xml", "Accept": "application/json" },
      data: xmlPayload,
    });
    const body = await response.json();
    expect(response.status()).toBe(201);
    expect((await response.headers())["content-type"]).toContain("application/json");
    expect(body.title).toBe("XML to JSON");
  });

  // 40 - POST /todos JSON to XML (201)
  test("40 challenge: POST /todos JSON to XML (201)", async ({ request }) => {
    const response = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json", "Accept": "application/xml" },
      data: { title: "JSON to XML", doneStatus: false, description: "Test" },
    });
    const body = await response.text();
    expect(response.status()).toBe(201);
    expect((await response.headers())["content-type"]).toContain("application/xml");
    expect(body).toMatch(/<title>JSON to XML<\/title>/);
  });

  // 41 - DELETE /heartbeat (405)
  test("41 challenge: DELETE /heartbeat (405)", async ({ request }) => {
    const response = await request.delete(`${URL}heartbeat`, {
      headers: { "x-challenger": token },
    });
    expect(response.status()).toBe(405);
  });

  // 42 - PATCH /heartbeat (500)
  test("42 challenge: PATCH /heartbeat (500)", async ({ request }) => {
    const response = await request.patch(`${URL}heartbeat`, {
      headers: { "x-challenger": token },
    });
    expect(response.status()).toBe(500);
  });

  // 43 - TRACE /heartbeat (501)
  test("43 challenge: TRACE /heartbeat (501)", async ({ request }) => {
    const response = await request.fetch(`${URL}heartbeat`, {
      method: "TRACE",
      headers: { "x-challenger": token },
    });
    expect(response.status()).toBe(501);
  });

  // 44 - GET /heartbeat (204)
  test("44 challenge: GET /heartbeat (204)", async ({ request }) => {
    const response = await request.get(`${URL}heartbeat`, {
      headers: { "x-challenger": token },
    });
    expect(response.status()).toBe(204);
    expect((await response.text())).toBe("");
  });

  // 45 - POST /heartbeat as DELETE (405)
  test("45 challenge: POST /heartbeat as DELETE (405)", async ({ request }) => {
    const response = await request.post(`${URL}heartbeat`, {
      headers: { "x-challenger": token, "X-HTTP-Method-Override": "DELETE" },
    });
    expect(response.status()).toBe(405);
  });

  // 46 - POST /heartbeat as PATCH (500)
  test("46 challenge: POST /heartbeat as PATCH (500)", async ({ request }) => {
    const response = await request.post(`${URL}heartbeat`, {
      headers: { "x-challenger": token, "X-HTTP-Method-Override": "PATCH" },
    });
    expect(response.status()).toBe(500);
  });

  // 47 - POST /heartbeat as TRACE (501)
  test("47 challenge: POST /heartbeat as TRACE (501)", async ({ request }) => {
    const response = await request.post(`${URL}heartbeat`, {
      headers: { "x-challenger": token, "X-HTTP-Method-Override": "TRACE" },
    });
    expect(response.status()).toBe(501);
  });

  // 48 - POST /secret/token (401)
  test("48 challenge: POST /secret/token (401)", async ({ request }) => {
    const authHeader = "Basic " + Buffer.from("Admin1:Pa55word").toString("base64");
    const response = await request.post(`${URL}secret/token`, {
      headers: { "x-challenger": token, "Authorization": authHeader },
    });
    expect(response.status()).toBe(401);
  });

  // 49 - POST /secret/token (201)
  test("49 challenge: POST /secret/token (201)", async ({ request }) => {
    const authHeader = "Basic " + Buffer.from("admin:password").toString("base64");
    const response = await request.post(`${URL}secret/token`, {
      headers: { "x-challenger": token, "Authorization": authHeader },
    });
    expect(response.status()).toBe(201);
    authToken = (await response.headers())["x-auth-token"];
  });

  // 50 - GET /secret/note (403)
  test("50 challenge: GET /secret/note (403)", async ({ request }) => {
    const response = await request.get(`${URL}secret/note`, {
      headers: { "x-challenger": token, "X-AUTH-TOKEN": "invalid-token-12345" },
    });
    expect(response.status()).toBe(403);
  });

  // 51 - GET /secret/note (401)
  test("51 challenge: GET /secret/note (401)", async ({ request }) => {
    const response = await request.get(`${URL}secret/note`, {
      headers: { "x-challenger": token },
    });
    expect(response.status()).toBe(401);
  });

  // 52 - GET /secret/note (200)
  test("52 challenge: GET /secret/note (200)", async ({ request }) => {
    if (!authToken) throw new Error("Run test 49 first to get X-AUTH-TOKEN");
    const response = await request.get(`${URL}secret/note`, {
      headers: { "x-challenger": token, "X-AUTH-TOKEN": authToken },
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body).toHaveProperty("note");
  });

  // 53 - POST /secret/note (200)
  test("53 challenge: POST /secret/note (200)", async ({ request }) => {
    if (!authToken) throw new Error("Run test 49 first to get X-AUTH-TOKEN");
    const response = await request.post(`${URL}secret/note`, {
      headers: { "x-challenger": token, "X-AUTH-TOKEN": authToken, "Content-Type": "application/json" },
      data: { note: "my note" },
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.note).toBe("my note");
  });

  // 54 - POST /secret/note (401)
  test("54 challenge: POST /secret/note (401)", async ({ request }) => {
    const response = await request.post(`${URL}secret/note`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { note: "my note" },
    });
    expect(response.status()).toBe(401);
  });

  // 55 - POST /secret/note (403)
  test("55 challenge: POST /secret/note (403)", async ({ request }) => {
    const response = await request.post(`${URL}secret/note`, {
      headers: { "x-challenger": token, "X-AUTH-TOKEN": "invalid-token-12345", "Content-Type": "application/json" },
      data: { note: "my note" },
    });
    expect(response.status()).toBe(403);
  });

  // 56 - GET /secret/note (Bearer) (200)
  test("56 challenge: GET /secret/note Bearer (200)", async ({ request }) => {
    if (!authToken) throw new Error("Run test 49 first to get X-AUTH-TOKEN");
    const response = await request.get(`${URL}secret/note`, {
      headers: { "x-challenger": token, "Authorization": `Bearer ${authToken}` },
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body).toHaveProperty("note");
  });

  // 57 - POST /secret/note (Bearer) (200)
  test("57 challenge: POST /secret/note Bearer (200)", async ({ request }) => {
    if (!authToken) throw new Error("Run test 49 first to get X-AUTH-TOKEN");
    const response = await request.post(`${URL}secret/note`, {
      headers: { "x-challenger": token, "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" },
      data: { note: "my note" },
    });
    const body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.note).toBe("my note");
  });

  // 58 - DELETE /todos/{id} (200) all
  test("58 challenge: DELETE /todos/{id} all (200)", async ({ request }) => {
    const getResponse = await request.get(`${URL}todos`, {
      headers: { "x-challenger": token },
    });
    const todos = (await getResponse.json()).todos || [];

    for (const todo of todos) {
      const response = await request.delete(`${URL}todos/${todo.id}`, {
        headers: { "x-challenger": token },
      });
      expect(response.status()).toBe(200);
    }

    const finalResponse = await request.get(`${URL}todos`, {
      headers: { "x-challenger": token },
    });
    expect((await finalResponse.json()).todos).toHaveLength(0);
  });

  // 59 - POST /todos (201) all
  test("59 challenge: POST /todos max (201)", async ({ request }) => {
    const MAX_TODOS = 20;
    const initialResponse = await request.get(`${URL}todos`, {
      headers: { "x-challenger": token },
    });
    const initialTodosCount = (await initialResponse.json()).todos.length;
    const todosToCreate = MAX_TODOS - initialTodosCount;

    for (let i = 1; i <= todosToCreate; i++) {
      const response = await request.post(`${URL}todos`, {
        headers: { "x-challenger": token, "Content-Type": "application/json" },
        data: { title: `Task ${initialTodosCount + i}`, doneStatus: false, description: "Test" },
      });
      expect(response.status()).toBe(201);
    }

    const finalResponse = await request.get(`${URL}todos`, {
      headers: { "x-challenger": token },
    });
    expect((await finalResponse.json()).todos.length).toBe(MAX_TODOS);

    const extraResponse = await request.post(`${URL}todos`, {
      headers: { "x-challenger": token, "Content-Type": "application/json" },
      data: { title: "Task Extra", doneStatus: false },
    });
    expect(extraResponse.status()).not.toBe(201);
  });
});