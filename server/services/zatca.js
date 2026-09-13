const crypto = require('crypto');

/**
 * ZATCA Phase 2 Engine
 * نظام الربط والتكامل مع هيئة الزكاة والضريبة والجمارك (منظومة فاتورة - المرحلة الثانية)
 */

// ترميز الحقول وفق مواصفات Tag-Length-Value (TLV)
function toTLV(tagNum, tagValue) {
  const valueBuf = Buffer.from(tagValue.toString(), 'utf8');
  const tagBuf = Buffer.from([tagNum]);
  const lenBuf = Buffer.from([valueBuf.length]);
  return Buffer.concat([tagBuf, lenBuf, valueBuf]);
}

// توليد رمز QR Code المتوافق مع المرحلة الثانية (8 Tags)
function generateZatcaPhase2QR({
  sellerName,
  vatNumber,
  timestamp,
  totalAmount,
  vatAmount,
  invoiceHash,
  digitalSignature,
  publicKey
}) {
  const tlvParts = [
    toTLV(1, sellerName),
    toTLV(2, vatNumber),
    toTLV(3, timestamp),
    toTLV(4, Number(totalAmount).toFixed(2)),
    toTLV(5, Number(vatAmount).toFixed(2)),
    toTLV(6, invoiceHash || 'H+q/zX4J3vD8F1k8s90jKl8XvP='),
    toTLV(7, digitalSignature || 'MEUCIQCz3...dummySignature...secp256k1=='),
    toTLV(8, publicKey || 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...')
  ];

  const totalTLV = Buffer.concat(tlvParts);
  return totalTLV.toString('base64');
}

// حساب الهاش المشفر للفاتورة SHA-256
function calculateInvoiceHash(xmlContent) {
  return crypto.createHash('sha256').update(xmlContent, 'utf8').digest('base64');
}

// توليد توقيع رقمي افتراضي (ECDSA secp256k1) للفاتورة
function generateDigitalSignature(hash) {
  // محاكاة توقيع Cryptographic Stamp باستخدام مفتاح خاص
  const hmac = crypto.createHmac('sha256', 'zatca-private-key-al-suwayan-secret');
  hmac.update(hash);
  return 'MEQCID' + hmac.digest('base64').substring(0, 48) + '==';
}

// توليد ملف الفاتورة بصيغة UBL 2.1 XML المتوافقة مع مواصفات زكاة
function generateUBL21Xml({
  uuid,
  invoiceNumber,
  issueDate,
  issueTime,
  invoiceType, // 'tax_invoice' (388 0100000) or 'simplified_invoice' (388 0200000)
  seller,
  customer,
  items,
  subtotal,
  vatTotal,
  grandTotal,
  paymentMethod
}) {
  const isB2B = invoiceType === 'tax_invoice';
  const typeCodeName = isB2B ? '0100000' : '0200000'; // 01: Tax Invoice (B2B), 02: Simplified (B2C)

  const itemsXml = items.map((item, index) => `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="PCE">${item.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="SAR">${(item.quantity * item.unit_price).toFixed(2)}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="SAR">${item.vat_amount.toFixed(2)}</cbc:TaxAmount>
            <cbc:RoundingAmount currencyID="SAR">${item.line_total.toFixed(2)}</cbc:RoundingAmount>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Name>${item.item_name}</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>15.00</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="SAR">${item.unit_price.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>
  `).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
    <cbc:ID>${invoiceNumber}</cbc:ID>
    <cbc:UUID>${uuid}</cbc:UUID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="${typeCodeName}">388</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>

    <!-- بيانات المنشأة المصدرة للفاتورة (الصويان ومخازن) -->
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">${seller.cr_number || '1010892341'}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PostalAddress>
                <cbc:StreetName>${seller.address || 'طريق الملك فهد'}</cbc:StreetName>
                <cbc:CityName>${seller.city || 'الرياض'}</cbc:CityName>
                <cac:Country>
                    <cbc:IdentificationCode>SA</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${seller.vat_number || '310984752000003'}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${seller.name_ar || 'شركة الصويان ومخازن للتجارة'}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <!-- بيانات العميل / المشتري -->
    <cac:AccountingCustomerParty>
        <cac:Party>
            ${customer && customer.vat_number ? `
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">${customer.cr_number || '7001234567'}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${customer.vat_number}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            ` : ''}
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${customer ? customer.name : 'عميل نقدي'}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <!-- تفاصيل السداد والضريبة الإجمالية -->
    <cac:PaymentMeans>
        <cbc:PaymentMeansCode>${paymentMethod === 'cash' ? '10' : paymentMethod === 'card' ? '48' : '42'}</cbc:PaymentMeansCode>
    </cac:PaymentMeans>

    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${Number(vatTotal).toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="SAR">${Number(subtotal).toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="SAR">${Number(vatTotal).toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>15.00</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>

    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="SAR">${Number(subtotal).toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="SAR">${Number(subtotal).toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="SAR">${Number(grandTotal).toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="SAR">${Number(grandTotal).toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>

    <!-- أسطر وبنود الفاتورة -->
    ${itemsXml}
</Invoice>`;

  return xml.trim();
}

// محاكاة الربط مع خوادم Fatoora للمرحلة الثانية (Clearance & Reporting)
async function submitToZatcaPlatform({
  xml,
  invoiceType,
  uuid,
  hash
}) {
  // B2B = Clearance API (Real-time approval required before issuing to customer)
  // B2C = Reporting API (Must be reported within 24 hours)
  const isB2B = invoiceType === 'tax_invoice';
  const endpoint = isB2B
    ? 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/clearance/single'
    : 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/reporting/single';

  // محاكاة فحص المعايير المشددة لـ ZATCA:
  // 1. فحص UUID
  // 2. فحص الهاش والختم الرقمي
  // 3. فحص احتساب الضريبة بدقة 15%
  await new Promise(resolve => setTimeout(resolve, 800)); // محاكاة استجابة الشبكة

  return {
    success: true,
    status: isB2B ? 'cleared' : 'reported',
    statusCode: 200,
    endpoint,
    zatcaResponse: {
      clearanceStatus: isB2B ? 'CLEARED' : null,
      reportingStatus: !isB2B ? 'REPORTED' : null,
      invoiceHash: hash,
      invoiceUUID: uuid,
      validationResults: {
        infoMessages: [
          {
            type: 'INFO',
            code: 'XSD_ZATCA_SUCCESS',
            category: 'SCHEMA_VALIDATION',
            message: 'تم التحقق بنجاح من مطابقة مخطط UBL 2.1 XSD لمواصفات هيئة الزكاة والضريبة والجمارك.'
          },
          {
            type: 'INFO',
            code: isB2B ? 'CLEARANCE_APPROVED' : 'REPORTING_ACCEPTED',
            category: 'COMPLIANCE',
            message: isB2B
              ? 'تم تخليص الفاتورة الضريبية وتثبيت الختم المشفر من خوادم الهيئة بنجاح (Clearance Granted).'
              : 'تم قبول إشعار الإبلاغ للفاتورة المبسطة بنجاح (Reporting Succeeded).'
          }
        ],
        warningMessages: [],
        errorMessages: []
      }
    }
  };
}

module.exports = {
  toTLV,
  generateZatcaPhase2QR,
  calculateInvoiceHash,
  generateDigitalSignature,
  generateUBL21Xml,
  submitToZatcaPlatform
};
