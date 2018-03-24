class dbAdapter extends require('pg').Client {
  constructor(databaseConfig) {
    super(databaseConfig);
    this.connect();
  }

  async query() {
    return (await super.query.apply(this, arguments)).rows;
  }

  async isEmptryQueryResult() {
    return (await this.query.apply(this, arguments).length) == 0
  }

  async forEach(sql, args, callback) {
    if (!callback)
      callback = args, args = [];

    let x = await this.query(sql, args);
    x.forEach(callback);
  }
}

module.exports = dbAdapter;