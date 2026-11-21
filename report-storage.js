const LEGACY_REPORTS_KEY = 'affiliate_saved_reports';
const REPORT_DATE_PATTERN = /^(?:0[1-9]|[12][0-9]|3[01]) (?:Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agt|Sep|Okt|Nov|Des) [0-9]{4}$/;
const REPORT_METRICS = ['klikMeta', 'klikShopee', 'produkTerjual', 'spend', 'komisi', 'profit', 'roas'];

function readLocalReports() {
    const reports = JSON.parse(localStorage.getItem(LEGACY_REPORTS_KEY) || '[]');
    if (!Array.isArray(reports)) throw new Error('Data laporan di browser rusak.');
    return reports;
}

function validateReports(reports) {
    if (!Array.isArray(reports)) throw new Error('Format cadangan laporan tidak valid.');

    const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const numericFields = (value, keys) => keys.every(key => value[key] == null || Number.isFinite(value[key]));
    const optionalText = value => value == null || typeof value === 'string';
    const validBreakdown = item =>
        object(item) && typeof item.displayTag === 'string' && numericFields(item, REPORT_METRICS) &&
        (item.trafficSourceCounts == null || (object(item.trafficSourceCounts) &&
            Object.values(item.trafficSourceCounts).every(Number.isFinite))) &&
        (item.productDetails == null || (Array.isArray(item.productDetails) && item.productDetails.every(product =>
            object(product) && optionalText(product.platform) && optionalText(product.waktuKlik) &&
            numericFields(product, ['komisi']))));

    reports.forEach((report, index) => {
        if (!object(report) || typeof report.tanggal !== 'string' ||
            (report.tanggal !== 'Tidak Diketahui' && !REPORT_DATE_PATTERN.test(report.tanggal)) ||
            !numericFields(report, REPORT_METRICS) ||
            (report.breakdown != null && (!Array.isArray(report.breakdown) || !report.breakdown.every(validBreakdown))) ||
            (report.metaAdsDetails != null && (!object(report.metaAdsDetails) ||
                !Object.values(report.metaAdsDetails).every(ad =>
                    object(ad) && optionalText(ad.displayName) && numericFields(ad, ['spend', 'clicks']))))) {
            throw new Error('Format laporan pada baris ' + (index + 1) + ' tidak valid.');
        }
    });
}

function mergeReports(existing, incoming, replace) {
    const byDate = new Map(existing.map(report => [report.tanggal, report]));
    for (const report of incoming) {
        if (replace || !byDate.has(report.tanggal)) byDate.set(report.tanggal, report);
    }
    return [...byDate.values()];
}

class ReportStorage {
    constructor(config) {
        this.url = config?.url?.trim();
        this.publishableKey = config?.publishableKey?.trim();
        this.cloudEnabled = Boolean(this.url || this.publishableKey);
        this.client = null;
        this.userId = null;
    }

    async signIn(email, password) {
        if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(this.url) ||
            !this.publishableKey?.startsWith('sb_publishable_')) {
            throw new Error('Konfigurasi database Supabase belum valid.');
        }

        if (!this.client) {
            const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.2/+esm');
            this.client = createClient(this.url, this.publishableKey, {
                auth: { persistSession: false, detectSessionInUrl: false }
            });
        }

        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw new Error('Login gagal. Periksa email, kata sandi, atau koneksi.');
        this.userId = data.user.id;
    }

    async signOut() {
        const { error } = await this.client.auth.signOut({ scope: 'local' });
        if (error) throw error;
        this.userId = null;
    }

    async list() {
        if (!this.cloudEnabled) return readLocalReports();

        const reports = [];
        let cursor;
        while (true) {
            let query = this.client.from('saved_reports')
                .select('report_date, report')
                .eq('user_id', this.userId)
                .order('report_date')
                .limit(100);
            if (cursor !== undefined) query = query.gt('report_date', cursor);

            const { data, error } = await query;
            if (error) throw error;
            if (data.length === 0) return reports;
            reports.push(...data.map(row => row.report));
            cursor = data.at(-1).report_date;
        }
    }

    async save(reports, { replace = false } = {}) {
        validateReports(reports);
        if (reports.length === 0) return 0;

        if (!this.cloudEnabled) {
            const existing = readLocalReports();
            const dates = new Set(existing.map(report => report.tanggal));
            const changed = mergeReports([], reports, replace).filter(report => replace || !dates.has(report.tanggal));
            localStorage.setItem(LEGACY_REPORTS_KEY, JSON.stringify(mergeReports(existing, changed, true)));
            return changed.length;
        }

        const rows = mergeReports([], reports, replace).map(report => ({
            user_id: this.userId,
            report_date: report.tanggal,
            report
        }));
        const { count, error } = await this.client.from('saved_reports').upsert(rows, {
            onConflict: 'user_id,report_date',
            ignoreDuplicates: !replace,
            count: 'exact'
        });
        if (error) throw error;
        return count ?? 0;
    }

    async remove(date) {
        if (!this.cloudEnabled) {
            if (date === undefined) localStorage.removeItem(LEGACY_REPORTS_KEY);
            else localStorage.setItem(LEGACY_REPORTS_KEY, JSON.stringify(readLocalReports().filter(report => report.tanggal !== date)));
            return;
        }

        let query = this.client.from('saved_reports').delete().eq('user_id', this.userId);
        if (date !== undefined) query = query.eq('report_date', date);
        const { error } = await query;
        if (error) throw error;
    }
}
