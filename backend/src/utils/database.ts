// backend/src/utils/database.ts

/**
 * Database utility functions
 */
export class DatabaseUtils {
    
    /**
     * Convert undefined values to null for MySQL compatibility
     * MySQL2 doesn't accept undefined values in parameters
     */
    static sanitizeForMySQL(value: any): any {
        return value === undefined ? null : value;
    }

    /**
     * Sanitize an array of values for MySQL
     */
    static sanitizeArrayForMySQL(values: any[]): any[] {
        return values.map(value => this.sanitizeForMySQL(value));
    }

    /**
     * Build dynamic WHERE clause for queries
     */
    static buildWhereClause(
        conditions: Record<string, any>, 
        prefix: string = ''
    ): { whereClause: string; params: any[] } {
        const whereParts: string[] = [];
        const params: any[] = [];
        
        for (const [key, value] of Object.entries(conditions)) {
            if (value !== undefined && value !== null && value !== '') {
                const columnName = prefix ? `${prefix}.${key}` : key;
                
                if (Array.isArray(value)) {
                    // Handle IN clauses
                    const placeholders = value.map(() => '?').join(', ');
                    whereParts.push(`${columnName} IN (${placeholders})`);
                    params.push(...value);
                } else if (typeof value === 'string' && value.includes('%')) {
                    // Handle LIKE clauses
                    whereParts.push(`${columnName} LIKE ?`);
                    params.push(value);
                } else {
                    // Handle equality
                    whereParts.push(`${columnName} = ?`);
                    params.push(value);
                }
            }
        }
        
        const whereClause = whereParts.length > 0 ? whereParts.join(' AND ') : '1=1';
        
        return { whereClause, params };
    }

    /**
     * Build dynamic UPDATE SET clause
     */
    static buildUpdateClause(
        updates: Record<string, any>, 
        allowedFields: string[]
    ): { setClause: string; params: any[] } {
        const setParts: string[] = [];
        const params: any[] = [];
        
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                setParts.push(`${field} = ?`);
                params.push(this.sanitizeForMySQL(updates[field]));
            }
        }
        
        const setClause = setParts.join(', ');
        
        return { setClause, params };
    }

    /**
     * Build pagination LIMIT/OFFSET clause
     */
    static buildPaginationClause(page: number = 1, limit: number = 20): { 
        limitClause: string; 
        offset: number; 
        validatedPage: number; 
        validatedLimit: number; 
    } {
        const validatedPage = Math.max(1, page);
        const validatedLimit = Math.min(100, Math.max(1, limit));
        const offset = (validatedPage - 1) * validatedLimit;
        
        return {
            limitClause: `LIMIT ${validatedLimit} OFFSET ${offset}`,
            offset,
            validatedPage,
            validatedLimit
        };
    }

    /**
     * Calculate pagination metadata
     */
    static calculatePagination(
        total: number, 
        page: number = 1, 
        limit: number = 20
    ): {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    } {
        const validatedPage = Math.max(1, page);
        const validatedLimit = Math.min(100, Math.max(1, limit));
        const totalPages = Math.ceil(total / validatedLimit);
        
        return {
            page: validatedPage,
            limit: validatedLimit,
            total,
            totalPages,
            hasNext: validatedPage < totalPages,
            hasPrev: validatedPage > 1
        };
    }

    /**
     * Format date for MySQL DATE type
     */
    static formatDateForMySQL(date: Date | string): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toISOString().split('T')[0];
    }

    /**
     * Format datetime for MySQL DATETIME type
     */
    static formatDateTimeForMySQL(date: Date | string): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toISOString().slice(0, 19).replace('T', ' ');
    }

    /**
     * Validate and sanitize ORDER BY clause to prevent SQL injection
     */
    static sanitizeOrderBy(
        orderBy: string, 
        allowedColumns: string[], 
        defaultOrder: string = 'id ASC'
    ): string {
        if (!orderBy) return defaultOrder;
        
        const parts = orderBy.toLowerCase().split(' ');
        const column = parts[0];
        const direction = parts[1] === 'desc' ? 'DESC' : 'ASC';
        
        if (allowedColumns.includes(column)) {
            return `${column} ${direction}`;
        }
        
        return defaultOrder;
    }

    /**
     * Escape string for LIKE queries (% and _ characters)
     */
    static escapeLikeString(str: string): string {
        return str.replace(/[%_]/g, '\\$&');
    }

    /**
     * Build search WHERE clause for multiple columns
     */
    static buildSearchClause(
        searchTerm: string, 
        searchColumns: string[], 
        prefix: string = ''
    ): { whereClause: string; params: any[] } {
        if (!searchTerm || searchColumns.length === 0) {
            return { whereClause: '1=1', params: [] };
        }
        
        const escapedTerm = `%${this.escapeLikeString(searchTerm)}%`;
        const searchParts = searchColumns.map(column => {
            const columnName = prefix ? `${prefix}.${column}` : column;
            return `${columnName} LIKE ?`;
        });
        
        const whereClause = `(${searchParts.join(' OR ')})`;
        const params = new Array(searchColumns.length).fill(escapedTerm);
        
        return { whereClause, params };
    }

    /**
     * Check if a table exists
     */
    static async tableExists(tableName: string): Promise<boolean> {
        const { createDatabaseConnection } = await import('../config/database');
        
        try {
            const db = await createDatabaseConnection();
            const [rows] = await db.execute(
                `SELECT COUNT(*) as count FROM information_schema.tables 
                 WHERE table_schema = DATABASE() AND table_name = ?`,
                [tableName]
            );
            
            return (rows as any[])[0].count > 0;
        } catch (error) {
            console.error('Error checking table existence:', error);
            return false;
        }
    }

    /**
     * Get database connection info
     */
    static async getDatabaseInfo(): Promise<any> {
        const { createDatabaseConnection } = await import('../config/database');
        
        try {
            const db = await createDatabaseConnection();
            const [rows] = await db.execute('SELECT DATABASE() as db_name, VERSION() as version');
            return (rows as any[])[0];
        } catch (error) {
            console.error('Error getting database info:', error);
            return null;
        }
    }
}