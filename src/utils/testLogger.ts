class TestLogger {
  private _initialized: boolean = false;

  init() {
    this._initialized = true;
    this.log('📝 测试日志已初始化');
  }

  log(message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }
}

export const testLogger = new TestLogger();
