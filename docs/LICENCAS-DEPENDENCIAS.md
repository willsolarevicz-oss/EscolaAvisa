# Licenças das dependências

> Gerado por `npm run licencas` (no `backend/`) a partir dos `package-lock.json`. Não edite à mão.
> Só dependências de **produção** (as de desenvolvimento não são distribuídas).

O EscolaAvisa é software proprietário (ver [LICENSE](../LICENSE)). Todas as dependências abaixo usam
licenças **permissivas**, que permitem o uso em software fechado desde que os avisos de copyright
delas sejam mantidos (eles ficam dentro de cada pacote em `node_modules` e no bundle do frontend).
A CI roda `npm run licencas -- --verificar` e falha se aparecer licença copyleft ou desconhecida.

## backend (125 pacotes)

| Licença | Pacotes |
| --- | --- |
| MIT | 105 |
| ISC | 11 |
| BlueOak-1.0.0 | 5 |
| BSD-3-Clause | 2 |
| BSD-2-Clause | 1 |
| Apache-2.0 | 1 |

<details><summary>Lista completa</summary>

| Pacote | Versão | Licença |
| --- | --- | --- |
| accepts | 2.0.0 | MIT |
| ansi-regex | 6.4.0 | MIT |
| ansi-styles | 6.2.3 | MIT |
| balanced-match | 4.0.4 | MIT |
| bcrypt | 6.0.0 | MIT |
| body-parser | 2.4.0 | MIT |
| brace-expansion | 5.0.12 | MIT |
| buffer-equal-constant-time | 1.0.1 | BSD-3-Clause |
| bytes | 3.1.2 | MIT |
| call-bind-apply-helpers | 1.0.2 | MIT |
| call-bound | 1.0.4 | MIT |
| cliui | 9.0.1 | ISC |
| content-disposition | 2.0.1 | MIT |
| content-type | 2.1.0 | MIT |
| cookie | 0.7.2 | MIT |
| cookie-signature | 1.2.2 | MIT |
| cors | 2.8.6 | MIT |
| debug | 4.4.3 | MIT |
| depd | 2.0.0 | MIT |
| dotenv | 18.0.9 | BSD-2-Clause |
| dunder-proto | 1.0.1 | MIT |
| ecdsa-sig-formatter | 1.0.11 | Apache-2.0 |
| ee-first | 1.1.1 | MIT |
| emoji-regex | 10.6.0 | MIT |
| encodeurl | 2.0.0 | MIT |
| es-define-property | 1.0.1 | MIT |
| es-errors | 1.3.0 | MIT |
| es-object-atoms | 1.1.2 | MIT |
| escalade | 3.2.0 | MIT |
| escape-html | 1.0.3 | MIT |
| etag | 1.8.1 | MIT |
| express | 5.3.0 | MIT |
| express-rate-limit | 8.7.1 | MIT |
| finalhandler | 2.1.1 | MIT |
| forwarded | 0.2.0 | MIT |
| fresh | 2.0.0 | MIT |
| function-bind | 1.1.2 | MIT |
| get-caller-file | 2.0.5 | ISC |
| get-east-asian-width | 1.7.0 | MIT |
| get-intrinsic | 1.3.0 | MIT |
| get-proto | 1.0.1 | MIT |
| glob | 13.0.6 | BlueOak-1.0.0 |
| gopd | 1.2.0 | MIT |
| has-symbols | 1.1.0 | MIT |
| hasown | 2.0.4 | MIT |
| helmet | 8.3.0 | MIT |
| http-errors | 2.0.1 | MIT |
| iconv-lite | 0.7.3 | MIT |
| inherits | 2.0.4 | ISC |
| ip-address | 10.7.5 | MIT |
| ipaddr.js | 1.9.1 | MIT |
| is-promise | 4.0.0 | MIT |
| jiti | 2.7.0 | MIT |
| jsonwebtoken | 9.0.3 | MIT |
| jwa | 2.0.1 | MIT |
| jws | 4.0.1 | MIT |
| lodash.includes | 4.3.0 | MIT |
| lodash.isboolean | 3.0.3 | MIT |
| lodash.isinteger | 4.0.4 | MIT |
| lodash.isnumber | 3.0.3 | MIT |
| lodash.isplainobject | 4.0.6 | MIT |
| lodash.isstring | 4.0.1 | MIT |
| lodash.once | 4.1.1 | MIT |
| lru-cache | 11.5.3 | BlueOak-1.0.0 |
| math-intrinsics | 1.1.0 | MIT |
| media-typer | 1.1.1 | MIT |
| merge-descriptors | 2.0.0 | MIT |
| mime-db | 1.54.0 | MIT |
| mime-types | 3.0.2 | MIT |
| minimatch | 10.2.6 | BlueOak-1.0.0 |
| minipass | 7.1.3 | BlueOak-1.0.0 |
| ms | 2.1.3 | MIT |
| negotiator | 1.1.0 | MIT |
| node-addon-api | 8.9.2 | MIT |
| node-gyp-build | 4.8.4 | MIT |
| node-pg-migrate | 9.0.0 | MIT |
| object-assign | 4.1.1 | MIT |
| object-inspect | 1.13.4 | MIT |
| on-finished | 2.4.2 | MIT |
| once | 1.4.0 | ISC |
| parseurl | 1.3.3 | MIT |
| path-scurry | 2.0.2 | BlueOak-1.0.0 |
| path-to-regexp | 8.4.2 | MIT |
| pg | 8.23.1 | MIT |
| pg-cloudflare | 1.4.1 | MIT |
| pg-connection-string | 2.14.1 | MIT |
| pg-int8 | 1.0.1 | ISC |
| pg-pool | 3.14.0 | MIT |
| pg-protocol | 1.16.1 | MIT |
| pg-types | 2.2.0 | MIT |
| pgpass | 1.0.5 | MIT |
| postgres-array | 2.0.0 | MIT |
| postgres-bytea | 1.0.1 | MIT |
| postgres-date | 1.0.7 | MIT |
| postgres-interval | 1.2.0 | MIT |
| proxy-addr | 2.0.8 | MIT |
| qs | 6.17.0 | BSD-3-Clause |
| range-parser | 1.3.0 | MIT |
| raw-body | 3.0.2 | MIT |
| router | 2.2.0 | MIT |
| safe-buffer | 5.2.1 | MIT |
| safer-buffer | 2.1.2 | MIT |
| semver | 7.8.5 | ISC |
| send | 1.2.1 | MIT |
| serve-static | 2.2.1 | MIT |
| setprototypeof | 1.2.0 | ISC |
| side-channel | 1.1.1 | MIT |
| side-channel-list | 1.0.1 | MIT |
| side-channel-map | 1.0.1 | MIT |
| side-channel-weakmap | 1.0.2 | MIT |
| split2 | 4.2.0 | ISC |
| statuses | 2.0.2 | MIT |
| string-width | 7.2.0 | MIT |
| strip-ansi | 7.2.0 | MIT |
| toidentifier | 1.0.1 | MIT |
| type-is | 2.1.0 | MIT |
| unpipe | 1.0.0 | MIT |
| vary | 1.1.2 | MIT |
| wrap-ansi | 9.0.2 | MIT |
| wrappy | 1.0.2 | ISC |
| xtend | 4.0.2 | MIT |
| y18n | 5.0.8 | ISC |
| yargs | 18.0.0 | MIT |
| yargs-parser | 22.0.0 | ISC |
| zod | 4.6.7 | MIT |

</details>

## frontend (35 pacotes)

| Licença | Pacotes |
| --- | --- |
| MIT | 33 |
| OFL-1.1 | 1 |
| ISC | 1 |

<details><summary>Lista completa</summary>

| Pacote | Versão | Licença |
| --- | --- | --- |
| @fontsource-variable/inter | 5.3.0 | OFL-1.1 |
| agent-base | 6.0.2 | MIT |
| asynckit | 0.4.0 | MIT |
| axios | 1.21.0 | MIT |
| call-bind-apply-helpers | 1.0.2 | MIT |
| combined-stream | 1.0.8 | MIT |
| cookie | 1.1.1 | MIT |
| debug | 4.4.3 | MIT |
| delayed-stream | 1.0.0 | MIT |
| dunder-proto | 1.0.1 | MIT |
| es-define-property | 1.0.1 | MIT |
| es-errors | 1.3.0 | MIT |
| es-object-atoms | 1.1.2 | MIT |
| es-set-tostringtag | 2.1.0 | MIT |
| follow-redirects | 1.16.2 | MIT |
| form-data | 4.0.6 | MIT |
| function-bind | 1.1.2 | MIT |
| get-intrinsic | 1.3.0 | MIT |
| get-proto | 1.0.1 | MIT |
| gopd | 1.2.0 | MIT |
| has-symbols | 1.1.0 | MIT |
| has-tostringtag | 1.0.2 | MIT |
| hasown | 2.0.4 | MIT |
| https-proxy-agent | 5.0.1 | MIT |
| lucide-react | 1.62.0 | ISC |
| math-intrinsics | 1.1.0 | MIT |
| mime-db | 1.52.0 | MIT |
| mime-types | 2.1.35 | MIT |
| ms | 2.1.3 | MIT |
| proxy-from-env | 2.1.0 | MIT |
| react | 19.3.1 | MIT |
| react-dom | 19.3.1 | MIT |
| react-router | 7.18.5 | MIT |
| scheduler | 0.28.0 | MIT |
| set-cookie-parser | 2.7.3 | MIT |

</details>
