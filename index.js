const axios = require("axios");
const readline = require("readline");

// State
let state = {
  direction: "up",
  effect: "power",
  preset: "sunset",
};

async function updatePreset(effect_id, preset_id) {
  const apiUrl = "http://crystalspc.local:8888/api/virtuals/both/presets";
  const payload = {
    category: "user_presets",
    effect_id,
    preset_id,
  };

  try {
    const response = await axios.put(apiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("PUT request successful!");
    console.log("Response status:", response.status);
    console.log("Response data:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error making PUT request:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
      return {
        success: false,
        error: error.response.data,
        status: error.response.status,
      };
    } else if (error.request) {
      console.error("No response received:", error.request);
      return { success: false, error: "No response received" };
    } else {
      console.error("Error:", error.message);
      return { success: false, error: error.message };
    }
  }
}

async function makeApiCall() {
  const preset_id = `${state.preset}-${state.direction}`;
  console.log(
    `\nCalling API with effect: ${state.effect}, preset_id: ${preset_id}`
  );
  await updatePreset(state.effect, preset_id);
}

function handleKeyPress(key) {
  const keyMap = {
    a: () => {
      state.direction = "up";
      console.log("Direction set to: up");
    },
    b: () => {
      state.direction = "down";
      console.log("Direction set to: down");
    },
    c: () => {
      state.direction = "in";
      console.log("Direction set to: in");
    },
    d: () => {
      state.direction = "out";
      console.log("Direction set to: out");
    },
    e: () => {
      state.effect = "power";
      state.preset = "sunset";
      console.log("Effect set to: power, Preset set to: sunset");
    },
    f: () => {
      state.effect = "power";
      state.preset = "peach";
      console.log("Effect set to: power, Preset set to: peach");
    },
    g: () => {
      state.effect = "power";
      state.preset = "fire";
      console.log("Effect set to: power, Preset set to: fire");
    },
    h: () => {
      state.effect = "energy";
      state.preset = "rgb";
      console.log("Effect set to: energy, Preset set to: rgb");
    },
    i: () => {
      state.effect = "energy";
      state.preset = "rtb";
      console.log("Effect set to: energy, Preset set to: rtb");
    },
    j: () => {
      state.effect = "energy";
      state.preset = "rpb";
      console.log("Effect set to: energy, Preset set to: rpb");
    },
    k: () => {
      state.effect = "scan_multi";
      state.preset = "rgb";
      console.log("Effect set to: scan_multi, Preset set to: rgb");
    },
    l: () => {
      state.effect = "scan_multi";
      state.preset = "rtb";
      console.log("Effect set to: scan_multi, Preset set to: rtb");
    },
    m: () => {
      state.effect = "scan_multi";
      state.preset = "rpb";
      console.log("Effect set to: scan_multi, Preset set to: rpb");
    },
  };

  if (keyMap[key]) {
    keyMap[key]();
    makeApiCall();
  }
}

function setupKeyboardListener() {
  readline.emitKeypressEvents(process.stdin);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  console.log("LED Control App Started");
  console.log("======================");
  console.log("Direction keys: a=up, b=down, c=in, d=out");
  console.log("Power effects: e=sunset, f=peach, g=fire");
  console.log("Energy effects: h=rgb, i=rtb, j=rpb");
  console.log("Scan effects: k=rgb, l=rtb, m=rpb");
  console.log("Press Ctrl+C to exit\n");
  console.log(
    `Current state: effect=${state.effect}, preset=${state.preset}, direction=${state.direction}\n`
  );

  process.stdin.on("keypress", (str, key) => {
    if (key.ctrl && key.name === "c") {
      console.log("\nExiting...");
      process.exit();
    }

    if (key.name) {
      handleKeyPress(key.name);
    }
  });
}

// Start the app
setupKeyboardListener();
