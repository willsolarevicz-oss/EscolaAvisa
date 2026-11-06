import { describe, expect, it } from 'vitest';
import { eventoNoDia, periodoCurto, semanasDoMes, somarMeses } from './calendario';
import { lembrarLista, urlDaLista } from './listaMemoria';
import { alunoDaNavegacao } from './navegacao';
import { calcularMedia, formatNota, parseNota } from './notas';
import { corteValido, formatPercent } from './relatorios';

describe('notas', () => {
  it('parseNota aceita vírgula ou ponto, vazio vira null e o resto é inválido', () => {
    expect(parseNota('7,5')).toBe(7.5);
    expect(parseNota('7.5')).toBe(7.5);
    expect(parseNota('10')).toBe(10);
    expect(parseNota('')).toBeNull();
    expect(parseNota('11')).toBeNaN();
    expect(parseNota('7,25')).toBeNaN();
    expect(parseNota('abc')).toBeNaN();
  });

  it('formatNota usa vírgula e uma casa; média ignora bimestres vazios', () => {
    expect(formatNota(8)).toBe('8,0');
    expect(formatNota(null)).toBe('—');
    expect(calcularMedia({ 1: 7, 2: 8, 3: null, 4: null })).toBe(7.5);
    expect(calcularMedia({ 1: null, 2: null, 3: null, 4: null })).toBeNull();
  });
});

describe('calendario', () => {
  it('semanasDoMes começa no domingo e completa com células vazias', () => {
    const semanas = semanasDoMes('2026-02'); // 1º/02/2026 é domingo; 28 dias
    expect(semanas).toHaveLength(4);
    expect(semanas[0][0]).toEqual({ dia: 1, data: '2026-02-01' });
    const marco = semanasDoMes('2026-03'); // 1º/03/2026 é domingo; 31 dias
    expect(marco.at(-1).filter(Boolean)).toHaveLength(3);
    expect(marco.at(-1)[3]).toBeNull();
  });

  it('somarMeses vira o ano; período e evento de vários dias', () => {
    expect(somarMeses('2026-12', 1)).toBe('2027-01');
    expect(somarMeses('2026-01', -1)).toBe('2025-12');
    const evento = { dataInicio: '2026-10-28', dataFim: '2026-11-03' };
    expect(periodoCurto(evento)).toBe('28/10 a 03/11');
    expect(eventoNoDia(evento, '2026-11-01')).toBe(true);
    expect(eventoNoDia(evento, '2026-11-04')).toBe(false);
  });
});

describe('relatorios', () => {
  it('formatPercent não inventa 0% sem base; corte segue a regra das notas', () => {
    expect(formatPercent(0.333)).toBe('33%');
    expect(formatPercent(null)).toBe('—');
    expect(corteValido('5,5')).toBe(true);
    expect(corteValido('')).toBe(false);
    expect(corteValido('11')).toBe(false);
  });
});

describe('listaMemoria e navegacao', () => {
  it('lembra a URL da lista e ignora valor que não seja query string', () => {
    expect(urlDaLista('/usuarios')).toBe('/usuarios');
    lembrarLista('/usuarios', '?busca=joao&page=2');
    expect(urlDaLista('/usuarios')).toBe('/usuarios?busca=joao&page=2');
    sessionStorage.setItem('escolaavis.lista:/alunos', '//site-malicioso.com');
    expect(urlDaLista('/alunos')).toBe('/alunos');
  });

  it('alunoDaNavegacao só aceita o formato esperado', () => {
    const aluno = { id: 'a1', nome: 'Lara', matricula: 'A-001', extra: 'x' };
    expect(alunoDaNavegacao({ aluno })).toEqual({ id: 'a1', nome: 'Lara', matricula: 'A-001' });
    expect(alunoDaNavegacao({ aluno: { id: 1 } })).toBeNull();
    expect(alunoDaNavegacao(null)).toBeNull();
  });
});
