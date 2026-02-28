// File parsing utilities for CSV/Excel import

export function mapFieldsToSchema(fields: string[], importType: string): Record<string, string> {
    const mapping: Record<string, string> = {};

    if (importType === 'customers') {
        const customerFieldMap: Record<string, string[]> = {
            name: ['name', 'customer_name', 'full_name', 'fullname', 'customer'],
            phone: ['phone', 'telephone', 'mobile', 'phone_number', 'tel', 'contact'],
            email: ['email', 'email_address', 'e-mail', 'mail'],
            location: ['location', 'address', 'city', 'area', 'place', 'region'],
            notes: ['notes', 'note', 'comments', 'comment', 'remarks', 'description']
        };

        Object.keys(customerFieldMap).forEach(schemaField => {
            const possibleMatches = customerFieldMap[schemaField];
            const match = fields.find(field =>
                possibleMatches.some(pm => field.toLowerCase().includes(pm))
            );
            if (match) {
                mapping[schemaField] = match;
            }
        });
    } else if (importType === 'contacts') {
        const contactFieldMap: Record<string, string[]> = {
            first_name: ['first_name', 'firstname', 'first', 'fname', 'given_name'],
            last_name: ['last_name', 'lastname', 'last', 'lname', 'surname', 'family_name'],
            email: ['email', 'email_address', 'e-mail', 'mail'],
            phone: ['phone', 'telephone', 'mobile', 'phone_number', 'tel'],
            company: ['company', 'organization', 'org', 'business'],
            position: ['position', 'title', 'job_title', 'role'],
            address: ['address', 'street', 'street_address'],
            city: ['city', 'town'],
            state: ['state', 'province', 'region'],
            country: ['country', 'nation'],
            postal_code: ['postal_code', 'zip', 'zipcode', 'postcode', 'zip_code']
        };

        Object.keys(contactFieldMap).forEach(schemaField => {
            const possibleMatches = contactFieldMap[schemaField];
            const match = fields.find(field =>
                possibleMatches.some(pm => field.toLowerCase().includes(pm))
            );
            if (match) {
                mapping[schemaField] = match;
            }
        });
    } else if (importType === 'sales') {
        const salesFieldMap: Record<string, string[]> = {
            product_name: ['product', 'product_name', 'item', 'item_name'],
            quantity: ['quantity', 'qty', 'amount', 'count'],
            unit_price: ['unit_price', 'price', 'unit_cost', 'cost'],
            total_amount: ['total', 'total_amount', 'total_price', 'revenue'],
            sale_date: ['date', 'sale_date', 'order_date', 'transaction_date'],
            region: ['region', 'area', 'territory', 'location'],
            category: ['category', 'type', 'product_category', 'segment']
        };

        Object.keys(salesFieldMap).forEach(schemaField => {
            const possibleMatches = salesFieldMap[schemaField];
            const match = fields.find(field =>
                possibleMatches.some(pm => field.toLowerCase().includes(pm))
            );
            if (match) {
                mapping[schemaField] = match;
            }
        });
    }

    return mapping;
}

export function parseImportData(data: any[], mapping: Record<string, string>): any[] {
    return data.map(row => {
        const mapped: any = {};
        Object.keys(mapping).forEach(targetField => {
            const sourceField = mapping[targetField];
            if (sourceField && row[sourceField] !== undefined) {
                mapped[targetField] = row[sourceField];
            }
        });
        return mapped;
    });
}

export function validateContactData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.first_name && !data.last_name) {
        errors.push('Either first name or last name is required');
    }

    if (data.email && !isValidEmail(data.email)) {
        errors.push('Invalid email format');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
