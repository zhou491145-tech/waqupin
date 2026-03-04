/**
 * 通用仓库接口
 * 定义所有数据仓库的标准操作
 */
export interface IRepository<T> {
  /**
   * 初始化仓库
   * @param dataDir 数据目录
   */
  init(dataDir: string): void;

  /**
   * 加载所有数据
   * @returns 数据数组
   */
  loadAll(): T[];

  /**
   * 保存所有数据
   * @param items 数据数组
   * @returns 是否保存成功
   */
  saveAll(items: T[]): boolean;

  /**
   * 根据 ID 查找单个数据
   * @param id 数据 ID
   * @returns 找到的数据或 undefined
   */
  findById(id: string): T | undefined;

  /**
   * 添加单个数据
   * @param item 要添加的数据
   * @returns 是否添加成功
   */
  add(item: T): boolean;

  /**
   * 更新单个数据
   * @param id 数据 ID
   * @param updates 要更新的字段
   * @returns 是否更新成功
   */
  update(id: string, updates: Partial<T>): boolean;

  /**
   * 删除单个数据
   * @param id 数据 ID
   * @returns 是否删除成功
   */
  delete(id: string): boolean;

  /**
   * 获取文件路径（用于缓存键）
   * @returns 文件路径
   */
  getFilePath(): string;
}
